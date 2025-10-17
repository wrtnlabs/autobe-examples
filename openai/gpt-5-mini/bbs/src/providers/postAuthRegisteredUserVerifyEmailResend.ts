import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function postAuthRegisteredUserVerifyEmailResend(props: {
  body: IEconPoliticalForumRegisteredUser.IResendVerification;
}): Promise<IEconPoliticalForumRegisteredUser.IGenericSuccess> {
  const { body } = props;
  const { email } = body;

  try {
    const user =
      await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
        where: { email },
      });

    if (user && user.email_verified !== true) {
      const oneHourAgo = toISOStringSafe(new Date(Date.now() - 60 * 60 * 1000));

      const recentCount =
        await MyGlobal.prisma.econ_political_forum_audit_logs.count({
          where: {
            registereduser_id: user.id,
            action_type: "resend_verification",
            created_at: { gte: oneHourAgo },
          },
        });

      if (recentCount < 3) {
        const token = v4() as string & tags.Format<"uuid">;
        const now = toISOStringSafe(new Date());

        await MyGlobal.prisma.econ_political_forum_notifications.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            registereduser_id: user.id,
            actor_registereduser_id: null,
            type: "verification",
            title: "Email verification",
            body: "Please verify your email address using the provided link.",
            payload: JSON.stringify({ token }),
            is_read: false,
            delivered_at: null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            related_thread_id: null,
            related_post_id: null,
            related_moderation_case_id: null,
          },
        });

        await MyGlobal.prisma.econ_political_forum_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            registereduser_id: user.id,
            moderator_id: null,
            post_id: null,
            thread_id: null,
            report_id: null,
            moderation_case_id: null,
            action_type: "resend_verification",
            target_type: "registered_user",
            target_identifier: user.email,
            details: JSON.stringify({ token }),
            created_at: now,
            created_by_system: true,
          },
        });
      }
    }

    return {
      success: true,
      message:
        "If an account exists for this email address, a verification message will be sent.",
    };
  } catch (err) {
    const now = toISOStringSafe(new Date());
    try {
      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: null,
          moderator_id: null,
          post_id: null,
          thread_id: null,
          report_id: null,
          moderation_case_id: null,
          action_type: "resend_verification_error",
          target_type: "registered_user",
          target_identifier: email,
          details:
            err && (err as Error).message
              ? (err as Error).message
              : String(err),
          created_at: now,
          created_by_system: true,
        },
      });
    } catch (_) {
      // swallow
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
