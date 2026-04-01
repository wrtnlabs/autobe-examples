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
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
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
  const whereInput: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_members_id: props.userId,
    deleted_at: null,
  };
  if (props.body.postId !== undefined) {
    whereInput.reddit_community_posts_id = props.body.postId;
  }
  if (props.body.authorId !== undefined) {
    whereInput.reddit_community_members_id = props.body.authorId;
  }
  if (props.body.afterDate !== undefined && props.body.afterDate !== null) {
    if (props.body.beforeDate !== undefined && props.body.beforeDate !== null) {
      whereInput.created_at = {
        gt: toISOStringSafe(props.body.afterDate),
        lt: toISOStringSafe(props.body.beforeDate),
      };
    } else {
      whereInput.created_at = {
        gt: toISOStringSafe(props.body.afterDate),
      };
    }
  } else if (
    props.body.beforeDate !== undefined &&
    props.body.beforeDate !== null
  ) {
    whereInput.created_at = {
      lt: toISOStringSafe(props.body.beforeDate),
    };
  }
  if (props.body.minDepth !== undefined) {
    if (props.body.minDepth === 0) {
      // No additional filter needed
    } else {
      whereInput.parent_comment_id = { not: null };
    }
  }
  if (props.body.maxDepth !== undefined) {
    if (props.body.maxDepth === 0) {
      whereInput.parent_comment_id = null;
    }
  }
  const orderByInput: Prisma.reddit_community_commentsOrderByWithRelationInput[] =
    [];
  orderByInput.push({ created_at: "desc" });
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
  return {
    data: await ArrayUtil.asyncMap(data, (elem) =>
      RedditCommunityCommentAtSummaryTransformer.transform(elem),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
