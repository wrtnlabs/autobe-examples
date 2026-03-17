import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestUsersUserIdComments(props: {
  guest: GuestPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "best";
  const whereInput: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_members_id: props.userId,
    deleted_at: null,
  };
  const orderByInput: Prisma.reddit_community_commentsOrderByWithRelationInput[] =
    [{ created_at: "desc" }];
  const commentsData = await MyGlobal.prisma.reddit_community_comments.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
      },
    },
  );
  const totalCount = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereInput,
  });
  const transformedComments = await ArrayUtil.asyncMap(
    commentsData,
    async (comment) => {
      return {
        id: comment.id as string & tags.Format<"uuid">,
        voteScore: 0,
        createdAt: comment.created_at.toISOString(),
        parentComment: null,
        replyCount: 0,
        author: {
          id: comment.author.id as string & tags.Format<"uuid">,
          username: comment.author.username,
          created_at: comment.author.created_at.toISOString(),
        } satisfies IRedditCommunityMember.ISummary,
      } satisfies IRedditCommunityComment.ISummary;
    },
  );
  const pages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages,
    } satisfies IPage.IPagination,
    data: transformedComments,
  } satisfies IPageIRedditCommunityComment.ISummary;
}
