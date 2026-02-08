import { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfUsers";
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
  body: ICommunityPlatformCommentVoteOfUsers.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteOfUsers.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_comment_vote_of_usersWhereInput = {};
  const orderBy: Prisma.community_platform_comment_vote_of_usersOrderByWithRelationInput =
    { created_at: "desc" };
  const records =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });
  const totalRecords =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.count({
      where,
    });
  const data: ICommunityPlatformCommentVoteOfUsers.ISummary[] = records.map(
    (rec) => ({
      vote_id: rec.id,
      user_id: rec.community_platform_user_id,
      comment_id: rec.community_platform_comment_id,
      vote_type: rec.vote_type,
      created_at: toISOStringSafe(rec.created_at) ?? "1970-01-01T00:00:00.000Z",
      updated_at:
        rec.updated_at !== null ? toISOStringSafe(rec.updated_at) : null,
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
    },
    data,
  };
}
