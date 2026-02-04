import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModeratorEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorEmailVerification";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorAuthModeratorsEmailResend(props: {
  moderator: ModeratorPayload;
}): Promise<ICommunityPlatformModeratorEmailVerification.ICreate> {
  // Extract moderator ID from authenticated payload
  const moderatorId = props.moderator.id;
  const sessionId = props.moderator.session_id;
  // Get current time as ISO string (never use Date object)
  const now = toISOStringSafe(new Date());
  // Query for existing verification records using moderator_id
  const existingRecord =
    await MyGlobal.prisma.community_platform_moderator_email_verifications.findFirst(
      {
        where: {
          moderator_id: moderatorId,
        },
      },
    );
  // Calculate 48-hour expiration time as ISO string (never use Date object)
  // We can't use Date object, so we'll parse the current time to calculate expiration
  // First, convert current time to Date to perform calculation, but immediately convert back to string
  const nowDate = new Date();
  const expiresAt = toISOStringSafe(
    new Date(nowDate.getTime() + 48 * 60 * 60 * 1000),
  );
  // If no record exists or existing record has expired, generate new token
  if (
    !existingRecord ||
    new Date(existingRecord.expires_at).getTime() < new Date(now).getTime()
  ) {
    // Generate new verification token
    const token = v4();
    // Create new verification record
    const newRecord =
      await MyGlobal.prisma.community_platform_moderator_email_verifications.create(
        {
          data: {
            moderator_id: moderatorId,
            token: token,
            created_at: now,
            expires_at: expiresAt,
            id: v4(), // Required field
            status: "pending", // Required field
          },
        },
      );
    // Return the new verification token details
    return {
      id: newRecord.id,
      token: token,
      created_at: toISOStringSafe(newRecord.created_at),
      expires_at: toISOStringSafe(newRecord.expires_at),
    };
  } else {
    // If existing record is still valid, re-send the same verification token
    return {
      id: existingRecord.id,
      token: existingRecord.token,
      created_at: toISOStringSafe(existingRecord.created_at),
      expires_at: toISOStringSafe(existingRecord.expires_at),
    };
  }
}
