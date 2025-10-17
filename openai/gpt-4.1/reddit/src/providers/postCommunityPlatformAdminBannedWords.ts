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

export async function postCommunityPlatformAdminBannedWords(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedWord.ICreate;
}): Promise<ICommunityPlatformBannedWord> {
  const now = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.community_platform_banned_words.create({
        data: {
          id: v4(),
          word: props.body.word,
          reason: props.body.reason ?? undefined,
          active: props.body.active,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      word: created.word,
      reason: created.reason ?? undefined,
      active: created.active,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Banned word already exists", 409);
    }
    throw error;
  }
}
