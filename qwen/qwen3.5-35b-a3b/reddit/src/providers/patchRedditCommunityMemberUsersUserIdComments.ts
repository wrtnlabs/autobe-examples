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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberUsersUserIdComments(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_members_id: props.userId,
    deleted_at: null,
    ...(props.body.postId && {
      reddit_community_posts_id: props.body.postId,
    }),
    ...(props.body.authorId && props.body.authorId !== props.userId
      ? {
          reddit_community_members_id: props.body.authorId,
        }
      : undefined),
    ...(props.body.communityId && {
      post: {
        community_id: props.body.communityId,
      },
    }),
    ...(props.body.afterDate && {
      created_at: {
        gt: props.body.afterDate,
      },
    }),
    ...(props.body.beforeDate && {
      created_at: {
        lt: props.body.beforeDate,
      },
    }),
    ...(props.body.minDepth !== undefined && {
      parent_comment_id: null,
    }),
  } satisfies Prisma.reddit_community_commentsWhereInput;
  const orderByInput: Prisma.reddit_community_commentsOrderByWithRelationInput[] =
    (
      props.body.sort === "new"
        ? [{ created_at: "desc" as const }]
        : props.body.sort === "controversial"
          ? [{ created_at: "desc" as const }]
          : [{ created_at: "desc" as const }]
    ) satisfies Prisma.reddit_community_commentsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    async (comment) =>
      await RedditCommunityCommentAtSummaryTransformer.transform(comment),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityComment.ISummary;
}
