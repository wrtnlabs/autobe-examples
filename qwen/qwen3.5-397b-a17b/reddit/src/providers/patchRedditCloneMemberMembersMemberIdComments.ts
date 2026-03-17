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

export async function patchRedditCloneMemberMembersMemberIdComments(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  const whereInput: Prisma.reddit_clone_commentsWhereInput = {
    reddit_clone_member_id: props.memberId,
    deleted_at: null,
    ...(props.body.date_from && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && {
      created_at: { lte: new Date(props.body.date_to) },
    }),
    ...(props.body.search && {
      body: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.reddit_clone_commentsWhereInput;
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "best":
        return { created_at: "desc" as const };
      case "controversial":
        return { created_at: "asc" as const };
      case "new":
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.reddit_clone_commentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: whereInput,
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
