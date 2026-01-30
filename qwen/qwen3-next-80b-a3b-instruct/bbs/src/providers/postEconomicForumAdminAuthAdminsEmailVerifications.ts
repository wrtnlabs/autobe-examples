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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicForumEmailVerificationCollector } from "../collectors/EconomicForumEmailVerificationCollector";
import { EconomicForumEmailVerificationTransformer } from "../transformers/EconomicForumEmailVerificationTransformer";

export async function postEconomicForumAdminAuthAdminsEmailVerifications(props: {
  admin: AdminPayload;
  body: IEconomicForumEmailVerification.ICreate;
}): Promise<IEconomicForumEmailVerification> {
  // Verify rate limit: max 3 requests per hour per admin
  const oneHourAgo = toISOStringSafe(new Date(Date.now() - 3600000));
  const recentRequests =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.count({
      where: {
        admin_id: props.admin.id,
        created_at: {
          gte: oneHourAgo,
        },
        deleted_at: null,
      },
    });
  if (recentRequests >= 3) {
    throw new HttpException(
      "Rate limit exceeded: Only 3 verification requests per hour allowed",
      429,
    );
  }
  // Check for existing unexpired verification
  const existing =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.findFirst({
      where: {
        admin_id: props.admin.id,
        deleted_at: null,
        expires_at: {
          gte: toISOStringSafe(new Date()),
        },
      },
    });
  if (existing) {
    throw new HttpException("An active email verification already exists", 409);
  }
  // Use collector to generate CreateInput with token, expires_at, status
  const created =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.create({
      data: await EconomicForumEmailVerificationCollector.collect({
        body: props.body,
        economicForumAdmins: { id: props.admin.id },
        economicForumAdminSessions: { id: props.admin.session_id },
      }),
      ...EconomicForumEmailVerificationTransformer.select(),
    });
  // Transform to response DTO
  return await EconomicForumEmailVerificationTransformer.transform(created);
}
