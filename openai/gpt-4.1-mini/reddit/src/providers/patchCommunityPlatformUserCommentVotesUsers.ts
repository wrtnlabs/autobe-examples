import { ICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserCommentVotesUsers(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentVoteOfUser.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteOfUser.ISummary> {
  const {
    userId,
    commentId,
    voteType,
    createdAtFrom,
    createdAtTo,
    page = 1,
    limit = 20,
  } = props.body;
  const safeLimit =
    limit === undefined ? 20 : Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;
  const whereConditionsArray =
    [] as Prisma.community_platform_comment_vote_of_usersWhereInput[];
  if (userId !== undefined)
    whereConditionsArray.push({ community_platform_user_id: userId });
  if (commentId !== undefined)
    whereConditionsArray.push({ community_platform_comment_id: commentId });
  if (voteType !== undefined)
    whereConditionsArray.push({ vote_type: voteType });
  if (createdAtFrom !== undefined)
    whereConditionsArray.push({ created_at: { gte: createdAtFrom } });
  if (createdAtTo !== undefined)
    whereConditionsArray.push({ created_at: { lte: createdAtTo } });
  whereConditionsArray.push({ deleted_at: null });
  const whereConditions: Prisma.community_platform_comment_vote_of_usersWhereInput =
    { AND: whereConditionsArray };
  const total =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.count({
      where: whereConditions,
    });
  const votes =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.findMany({
      where: whereConditions,
      skip,
      take: safeLimit,
      orderBy: [{ created_at: "desc" }],
      select: {
        id: true,
        community_platform_comment_id: true,
        community_platform_user_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  function toTaggedDateString(date: Date | null): string | null {
    if (date === null) return null;
    return date.toISOString() as string & tags.Format<"date-time">;
  }
  const mappedData: ICommunityPlatformCommentVoteOfUser.ISummary[] = votes.map(
    (v) => ({
      id: v.id,
      communityPlatformCommentId: v.community_platform_comment_id,
      communityPlatformUserId: v.community_platform_user_id,
      voteType: v.vote_type,
      createdAt: v.created_at.toISOString(),
      updatedAt: v.updated_at.toISOString(),
      deletedAt: v.deleted_at === null ? null : v.deleted_at.toISOString(),
    }),
  );
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
    data: mappedData,
  };
}
