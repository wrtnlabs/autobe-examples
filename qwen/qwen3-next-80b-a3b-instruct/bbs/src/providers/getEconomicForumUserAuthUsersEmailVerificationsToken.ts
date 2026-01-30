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
import { IEconomicForumEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumEmailVerification";
import { UserPayload } from "../decorators/payload/UserPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEconomicForumUserAuthUsersEmailVerificationsToken(props: {
  user: UserPayload;
  token: string;
}): Promise<IEconomicForumEmailVerification> {
  // Find the email verification record by token
  const verification =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.findUnique({
      where: {
        token: props.token,
      },
    });
  // If verification not found, throw 404
  if (!verification) {
    throw new HttpException("Invalid verification token", 404);
  }
  // Check if token is expired (created_at + 24 hours < current time)
  const createdIso = verification.created_at;
  // Calculate expiration time using JavaScript's Date object (temporary use only for comparison)
  const expirationDate = new Date(createdIso);
  expirationDate.setHours(expirationDate.getHours() + 24);
  if (expirationDate < new Date()) {
    throw new HttpException("Verification token has expired", 400);
  }
  // Check if token is already consumed (deleted_at is not null)
  if (verification.deleted_at !== null) {
    throw new HttpException("Verification token has already been used", 400);
  }
  // Use transaction to update both user and verification record atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.economic_forum_admins.update({
      where: {
        id: verification.admin_id,
      },
      data: {
        is_email_verified: true, // CORRECTED: Use actual field name from schema
      },
    }),
    MyGlobal.prisma.economic_forum_admin_email_verifications.update({
      where: {
        token: props.token,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
  // Return the verification response with updated status
  return {
    id: verification.id,
    admin_id: verification.admin_id,
    expires_at: toISOStringSafe(expirationDate),
    status: "consumed",
    created_at: toISOStringSafe(verification.created_at),
  };
}
