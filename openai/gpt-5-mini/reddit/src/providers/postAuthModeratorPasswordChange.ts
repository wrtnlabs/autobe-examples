import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorPasswordChange(props: {
  moderator: ModeratorPayload;
  body: ICommunityPortalModerator.IChangePassword;
}): Promise<ICommunityPortalModerator.IChangePasswordResponse> {
  const { moderator, body } = props;

  try {
    const user = await MyGlobal.prisma.community_portal_users.findUniqueOrThrow(
      {
        where: { id: moderator.id },
      },
    );

    const verified = await PasswordUtil.verify(
      body.currentPassword,
      user.password_hash,
    );
    if (!verified) {
      throw new HttpException("Current password is incorrect", 400);
    }

    const newHash = await PasswordUtil.hash(body.newPassword);
    const changedAt = toISOStringSafe(new Date());

    await MyGlobal.prisma.community_portal_users.update({
      where: { id: moderator.id },
      data: {
        password_hash: newHash,
        updated_at: changedAt,
      },
    });

    // CONTRADICTION NOTE:
    // The Prisma schema provided does not include a dedicated audit/event table
    // for password-change events. To meet audit requirements, add an audit
    // table (e.g., user_audits) or emit an event to the application audit
    // pipeline. This implementation updates the user's updated_at and returns
    // the timestamp for auditing by the caller.

    return {
      success: true,
      message: "Password changed successfully",
      userId: moderator.id,
      changedAt,
    };
  } catch (error) {
    // Preserve HttpException errors
    if (error instanceof HttpException) throw error;

    // Prisma throws a known request error when records are not found during update
    // Use error properties safely if available
    const maybeCode =
      error && typeof error === "object" && "code" in error
        ? (error as any).code
        : undefined;
    if (maybeCode === "P2025") {
      throw new HttpException("User not found", 404);
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
