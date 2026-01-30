import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload"

export async function putEconomicForumAdminAuthAdminsEmailVerifyToken(props: {
    admin: AdminPayload;
    token: string;
}): Promise<void> {
    // Query for the verification record
    const verification = await MyGlobal.prisma.economic_forum_admin_email_verifications.findUnique({
        where: { token: props.token },
    });
    // Return 404 if token doesn't exist
    if (!verification) {
        throw new HttpException("Token not found or expired", 404);
    }
    // Check expiration
    const now: string & tags.Format;
    "date-time"> = toISOStringSafe(new Date());;
    const expiresAt: string = toISOStringSafe(verification.expires_at);
    if (expiresAt <= now) {
        throw new HttpException("Token not found or expired", 404);
    }
    // Update the corresponding admin record to set email_verified to true
    await MyGlobal.prisma.economic_forum_admins.update({
        where: { id: verification.admin_id },
        data: { email_verified: true },
    });
    // Delete the verification record after successful verification
    await MyGlobal.prisma.economic_forum_admin_email_verifications.delete({
        where: { token: props.token },
    });
}
