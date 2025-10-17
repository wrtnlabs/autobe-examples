import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminBannedWordsBannedWordId(props: {
  admin: AdminPayload;
  bannedWordId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBannedWord> {
  const bannedWord =
    await MyGlobal.prisma.community_platform_banned_words.findUnique({
      where: { id: props.bannedWordId },
    });
  if (!bannedWord) {
    throw new HttpException("Banned word not found", 404);
  }
  return {
    id: bannedWord.id,
    word: bannedWord.word,
    reason: bannedWord.reason === null ? undefined : bannedWord.reason,
    active: bannedWord.active,
    created_at: toISOStringSafe(bannedWord.created_at),
    updated_at: toISOStringSafe(bannedWord.updated_at),
    deleted_at: bannedWord.deleted_at
      ? toISOStringSafe(bannedWord.deleted_at)
      : null,
  };
}
