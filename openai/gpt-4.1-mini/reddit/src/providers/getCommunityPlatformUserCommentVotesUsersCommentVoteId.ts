import { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
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

export async function getCommunityPlatformUserCommentVotesUsersCommentVoteId(props: {
  user: UserPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteOfUsers> {
  const record =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.findUnique({
      where: { id: props.commentVoteId },
    });
  if (!record) throw new HttpException("Comment vote not found", 404);
  return {
    id: record.id,
    community_platform_comment_id: record.community_platform_comment_id,
    community_platform_user_id: record.community_platform_user_id,
    vote_type: record.vote_type,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
