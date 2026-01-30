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
import { IEconomicForumAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdminEmailVerification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicForumAdminAuthAdminsEmailVerificationsToken(props: {
  admin: AdminPayload;
  token: string;
}): Promise<IEconomicForumAdminEmailVerification> {
  // Find verification record by token with schema-verified field names
  const verification =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.findUnique({
      where: {
        token: props.token,
        status: { not: "used" },
        expiration: { gt: new Date().toISOString() },
      },
    });
  // If verification doesn't exist or is invalid, throw 400
  if (!verification) {
    throw new HttpException("Verification failed", 400);
  }
  // Wrap updates in transaction for atomicity
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update verification record status to 'used'
    await prisma.economic_forum_admin_email_verifications.update({
      where: { token: props.token },
      data: { status: "used" },
    });
    // Update associated admin's emailVerificationStatus to 'verified'
    await prisma.economic_forum_admins.update({
      where: { id: verification.admin_id },
      data: { email_verification_status: "verified" },
    });
  });
  // Return empty success object as specified by interface
  return {};
}
