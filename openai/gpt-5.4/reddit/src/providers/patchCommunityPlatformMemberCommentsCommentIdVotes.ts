import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<IPageICommunityPlatformCommentVote> {
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "created_at" &&
    props.body.sort !== "-created_at" &&
    props.body.sort !== "updated_at" &&
    props.body.sort !== "-updated_at"
  ) {
    throw new HttpException("Invalid sort option", 400);
  }
  const where = {
    community_platform_comment_id: props.commentId,
    ...(props.body.direction !== undefined
      ? { direction: props.body.direction }
      : {}),
    ...(props.body.includeDeleted === true ? {} : { deleted_at: null }),
  } satisfies Prisma.community_platform_comment_votesWhereInput;
  const orderBy: Prisma.community_platform_comment_votesOrderByWithRelationInput[] =
    props.body.sort === "created_at"
      ? [{ created_at: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
      : props.body.sort === "updated_at"
        ? [{ updated_at: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
        : props.body.sort === "-updated_at"
          ? [
              { updated_at: Prisma.SortOrder.desc },
              { id: Prisma.SortOrder.desc },
            ]
          : [
              { created_at: Prisma.SortOrder.desc },
              { id: Prisma.SortOrder.desc },
            ];
  const data = await MyGlobal.prisma.community_platform_comment_votes.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    include: {
      member: true,
      comment: true,
    },
  });
  const records = await MyGlobal.prisma.community_platform_comment_votes.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(data, (item) =>
      CommunityPlatformCommentVoteTransformer.transform(item),
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
