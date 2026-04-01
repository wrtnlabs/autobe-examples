import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordResetValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordResetValidation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string;
}): Promise<IRedditLikeMemberPasswordResetValidation> {
  // Query both member and owner password reset tables for the token
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
  // Token not found in either table
  if (reset === null) {
    return {
      isValid: false,
      expiresAt: null,
      reason: "token_not_found",
    };
  }
  // Token already used
  if (reset.used_at !== null) {
    return {
      isValid: false,
      expiresAt: null,
      reason: "token_already_used",
    };
  }
  // Check if token has expired using ISO string comparison
  const nowISO = new Date().toISOString();
  const expiresISO = reset.expires_at.toISOString();
  if (expiresISO <= nowISO) {
    return {
      isValid: false,
      expiresAt: null,
      reason: "token_expired",
    };
  }
  // Token is valid
  return {
    isValid: true,
    expiresAt: expiresISO,
    reason: null,
  };
}
