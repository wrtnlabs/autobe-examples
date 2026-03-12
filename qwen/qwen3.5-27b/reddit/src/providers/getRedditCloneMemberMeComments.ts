import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberMeComments(props: {
  member: MemberPayload;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: {
      reddit_clone_member_id: props.member.id,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: {
      reddit_clone_member_id: props.member.id,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
