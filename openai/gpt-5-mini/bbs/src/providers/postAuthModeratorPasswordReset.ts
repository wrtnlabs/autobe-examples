import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function postAuthModeratorPasswordReset(props: {
  body: IEconPoliticalForumModerator.IPasswordResetRequest;
}): Promise<IEconPoliticalForumModerator.IPasswordResetRequestAck> {
  const { body } = props;

  const acknowledgement: IEconPoliticalForumModerator.IPasswordResetRequestAck =
    {
      success: true,
      message:
        "If an account exists for the provided email address, a password reset link will be sent.",
    };

  try {
    const user =
      await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
        where: { email: body.email },
      });

    if (!user) return acknowledgement;

    // Generate a raw token (primitive string) and assert uuid tag at primitive level
    const rawToken = typia.assert<string & tags.Format<"uuid">>(v4());
    const resetTokenHash = await PasswordUtil.hash(rawToken);

    // Convert Dates to ISO strings using the provided helper and assert date-time tag at primitive level
    const now = typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(new Date()),
    );
    const expires_at = typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
    );

    await MyGlobal.prisma.econ_political_forum_password_resets.create({
      data: {
        id: typia.assert<string & tags.Format<"uuid">>(v4()),
        registereduser_id: user.id,
        reset_token_hash: resetTokenHash,
        expires_at: expires_at,
        used: false,
        used_at: null,
        created_at: now,
        deleted_at: null,
      },
    });

    await MyGlobal.prisma.econ_political_forum_sessions.updateMany({
      where: {
        registereduser_id: user.id,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });

    try {
      // Optional mailer integration: include raw token only for mailer context
      // and never expose it to the API response.
      // Access mailer in a permissive way to avoid type errors on the global object.
      const globalAny = MyGlobal as unknown as { mailer?: any };
      if (globalAny.mailer?.enqueue) {
        await (globalAny.mailer.enqueue({
          to: user.email,
          template: "moderator_password_reset",
          context: { token: rawToken, expires_at },
        }) as Promise<unknown>);
      }
    } catch (mailerError) {
      // Log and continue - do not change acknowledgement
      // eslint-disable-next-line no-console
      console.error("Failed to enqueue password reset email:", mailerError);
    }

    return acknowledgement;
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
