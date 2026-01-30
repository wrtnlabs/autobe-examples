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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteEconomicForumUserAuthUsersEmailVerificationsToken(props: {
  user: UserPayload;
  token: string;
}): Promise<void> {
  // Validate token is provided
  if (!props.token || props.token.trim() === "") {
    throw new HttpException("Token is required", 400);
  }
  // Query for the verification token record
  const verification =
    await MyGlobal.prisma.economic_forum_user_email_verifications.findUnique({
      where: { token: props.token },
    });
  // If record doesn't exist, throw 404
  if (!verification) {
    throw new HttpException("Email verification token not found", 404);
  }
  // Business logic: Verify token is expired (used_at field does not exist in schema, so only check expiration)
  const expired = verification.expired_at < new Date();
  if (!expired) {
    throw new HttpException(
      "Token is still valid - cannot delete active token",
      400,
    );
  }
  // Perform hard delete
  await MyGlobal.prisma.economic_forum_user_email_verifications.delete({
    where: { token: props.token },
  });
  // Log audit event in system_audits table - only include properties that exist in schema
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      action: "DELETE_EMAIL_VERIFICATION_TOKEN",
      target_id: props.token,
      actor_type: "user" as const,
      target_type: "email_verification_token" as const,
      reason: "Expired email verification token deleted" as const,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
