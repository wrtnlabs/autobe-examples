import { ICommunityPlatformPostVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformUserPostVotesUsersPostVoteId(props: {
  user: UserPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteOfUsers> {
  const record =
    await MyGlobal.prisma.community_platform_post_vote_of_users.findUnique({
      where: { id: props.postVoteId },
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user_id: true,
        post_vote_id: true,
      },
    });
  if (!record) {
    throw new HttpException("User post vote not found", 404);
  }
  return {
    id: record.id,
    vote_type: record.vote_type,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    user_id: record.user_id,
    post_vote_id: record.post_vote_id,
  };
}
