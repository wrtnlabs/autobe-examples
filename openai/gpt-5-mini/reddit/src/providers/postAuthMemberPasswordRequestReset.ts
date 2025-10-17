import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function postAuthMemberPasswordRequestReset(props: {
  body: ICommunityPortalMember.IRequestPasswordReset;
}): Promise<ICommunityPortalMember.IPasswordResetRequested> {
  const { body } = props;
  const { email } = body;

  try {
    // Lookup user by email; select only minimal identifying fields
    const user = await MyGlobal.prisma.community_portal_users.findFirst({
      where: { email },
      select: { id: true, email: true, deleted_at: true },
    });

    // Always return the same generic message to avoid account enumeration
    const message =
      "If an account with that email exists, a password reset link has been sent to it.";

    // If user does not exist, short-circuit with generic response
    if (!user)
      return { message } as ICommunityPortalMember.IPasswordResetRequested;

    // Create a request identifier (tagged as uuid)
    const requestId = v4() as unknown as string & tags.Format<"uuid">;

    // Build a signed token bound to the user and request id with 1 hour TTL
    const secret =
      MyGlobal.env.JWT_SECRET_KEY ?? (MyGlobal.env as any).JWT_SECRET ?? "";
    const token = jwt.sign(
      { sub: user.id, type: "password_reset", rid: requestId },
      secret,
      {
        expiresIn: "1h",
      },
    );

    // Compute expiration time as ISO string using provided helper and tag the result
    const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)) as
      | string
      | (string & tags.Format<"date-time">);

    // Attempt delivery through available mailer interfaces. Failures are logged but do not affect client response.
    try {
      const frontendUrl = (MyGlobal.env as any).FRONTEND_URL ?? "";
      const resetLink = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

      if (
        (MyGlobal as any).mailer &&
        typeof (MyGlobal as any).mailer.send === "function"
      ) {
        await (MyGlobal as any).mailer.send({
          to: user.email,
          subject: "Password reset request",
          text: resetLink,
          html: `<p>To reset your password, click <a href="${resetLink}">this link</a>. The link expires at ${expiresAt} (UTC).</p>`,
        });
      } else if (
        (MyGlobal as any).mailer &&
        typeof (MyGlobal as any).mailer.sendMail === "function"
      ) {
        await (MyGlobal as any).mailer.sendMail({
          to: user.email,
          subject: "Password reset request",
          text: resetLink,
          html: `<p>To reset your password, click <a href="${resetLink}">this link</a>. The link expires at ${expiresAt} (UTC).</p>`,
        });
      } else {
        // No mailer configured - log for operational visibility in non-testing environments
        (MyGlobal as any).logger?.info?.(
          "postAuthMemberPasswordRequestReset: no mailer configured, skipping delivery",
        );
      }
    } catch (deliveryErr) {
      (MyGlobal as any).logger?.error?.(
        "postAuthMemberPasswordRequestReset: mail delivery error",
        deliveryErr,
      );
    }

    // Return the generic acknowledgement and an opaque request_id for tracing (non-sensitive)
    return {
      message,
      request_id: requestId,
    } as ICommunityPortalMember.IPasswordResetRequested;
  } catch (error) {
    (MyGlobal as any).logger?.error?.(
      "postAuthMemberPasswordRequestReset: unexpected error",
      error,
    );
    throw new HttpException("Internal Server Error", 500);
  }
}
