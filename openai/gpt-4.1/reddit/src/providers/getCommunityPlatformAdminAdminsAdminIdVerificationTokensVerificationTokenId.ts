import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminAdminsAdminIdVerificationTokensVerificationTokenId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  verificationTokenId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdminVerificationToken> {
  const record =
    await MyGlobal.prisma.community_platform_admin_verification_tokens.findFirst(
      {
        where: {
          id: props.verificationTokenId,
          community_platform_admin_id: props.adminId,
        },
      },
    );
  if (!record) {
    throw new HttpException(
      "Verification token not found or does not belong to admin",
      404,
    );
  }
  return {
    id: record.id,
    community_platform_admin_id: record.community_platform_admin_id,
    // As per API security policy, token string should NOT be exposed in standard flow
    token: "", // Intentionally left blank for security purposes
    expires_at: toISOStringSafe(record.expires_at),
    consumed: record.consumed,
    created_at: toISOStringSafe(record.created_at),
    consumed_at: record.consumed_at
      ? toISOStringSafe(record.consumed_at)
      : undefined,
  };
}
