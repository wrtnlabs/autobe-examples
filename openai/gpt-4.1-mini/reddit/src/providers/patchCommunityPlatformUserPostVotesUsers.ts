import { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUser";
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

function toDateTimeString(date: Date): string & tags.Format<"date-time"> {
  return date.toISOString() as string & tags.Format<"date-time">;
}
export async function patchCommunityPlatformUserPostVotesUsers(props: {
  user: UserPayload;
  body: ICommunityPlatformPostVoteOfUser.IRequest;
}): Promise<IPageICommunityPlatformPostVoteOfUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.userId && { user_id: props.body.userId }),
    ...(props.body.postId && { post_vote_id: props.body.postId }),
    ...(props.body.voteType && { vote_type: props.body.voteType }),
    deleted_at: null,
  } satisfies Prisma.community_platform_post_vote_of_usersWhereInput;
  const total =
    await MyGlobal.prisma.community_platform_post_vote_of_users.count({
      where,
    });
  const rows =
    await MyGlobal.prisma.community_platform_post_vote_of_users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const data = rows.map((row) => ({
    id: row.id,
    voteType: row.vote_type,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
    deletedAt: row.deleted_at ? toDateTimeString(row.deleted_at) : null,
    postVoteId: row.post_vote_id,
    userId: row.user_id,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
