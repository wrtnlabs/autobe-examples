import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformBannedWords } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWords";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminBannedWordsBannedWordId(props: {
  admin: AdminPayload;
  bannedWordId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBannedWords.IUpdate;
}): Promise<ICommunityPlatformBannedWords> {
  const { admin, bannedWordId, body } = props;

  // Fetch and validate the record (must exist and not soft deleted)
  const bannedWord =
    await MyGlobal.prisma.community_platform_banned_words.findUnique({
      where: { id: bannedWordId },
    });
  if (
    !bannedWord ||
    (bannedWord.deleted_at !== null && bannedWord.deleted_at !== undefined)
  ) {
    throw new HttpException("Banned word not found", 404);
  }

  // If updating 'word', enforce unique constraint (case-insensitive)
  if (
    typeof body.word === "string" &&
    body.word.trim().toLocaleLowerCase() !==
      bannedWord.word.trim().toLocaleLowerCase()
  ) {
    const duplicate =
      await MyGlobal.prisma.community_platform_banned_words.findFirst({
        where: {
          word: body.word,
          id: { not: bannedWordId },
          deleted_at: null,
        },
      });
    if (duplicate) {
      throw new HttpException("Banned word already exists", 409);
    }
  }

  // Update fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_banned_words.update({
    where: { id: bannedWordId },
    data: {
      ...(body.word !== undefined ? { word: body.word } : {}),
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    word: updated.word,
    reason: updated.reason,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
