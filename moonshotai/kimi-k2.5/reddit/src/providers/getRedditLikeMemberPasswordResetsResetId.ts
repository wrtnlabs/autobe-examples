import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordResetValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordResetValidation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPasswordResetsResetId(props: {
  member: AdminPayload;
  resetId: string;
}): Promise<IRedditLikeMemberPasswordResetValidation> {
  const memberReset =
    await MyGlobal.prisma.reddit_like_member_password_resets.findUnique({
      where: { token: props.resetId },
      select: {
        id: true,
        expires_at: true,
        used_at: true,
      },
    });
  const ownerReset =
    await MyGlobal.prisma.reddit_like_owner_password_resets.findUnique({
      where: { token: props.resetId },
      select: {
        id: true,
        expires_at: true,
        used_at: true,
      },
    });
  const reset = memberReset ?? ownerReset;
  if (reset === null) {
    return {
      isValid: false,
      expiresAt: null,
      reason: "token_not_found",
    } satisfies IRedditLikeMemberPasswordResetValidation;
  }
  if (reset.used_at !== null) {
    return {
      isValid: false,
      expiresAt: null,
      reason: "token_already_used",
    } satisfies IRedditLikeMemberPasswordResetValidation;
  }
  const now = new Date();
  if (reset.expires_at <= now) {
    return {
      isValid: false,
      expiresAt: null,
      reason: "token_expired",
    } satisfies IRedditLikeMemberPasswordResetValidation;
  }
  return {
    isValid: true,
    expiresAt: toISOStringSafe(reset.expires_at),
    reason: null,
  } satisfies IRedditLikeMemberPasswordResetValidation;
}
