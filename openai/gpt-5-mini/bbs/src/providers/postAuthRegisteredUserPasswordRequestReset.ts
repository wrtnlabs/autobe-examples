import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function postAuthRegisteredUserPasswordRequestReset(props: {
  body: IEconPoliticalForumRegisteredUser.IRequestPasswordReset;
}): Promise<IEconPoliticalForumRegisteredUser.IGenericSuccess> {
  const { body } = props;
  const { email } = body;

  try {
    const user =
      await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
        where: { email },
      });

    if (user) {
      const rawToken = v4();
      const reset_token_hash = await PasswordUtil.hash(rawToken);

      const expires_at = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60));
      const created_at = toISOStringSafe(new Date());

      await MyGlobal.prisma.econ_political_forum_password_resets.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: user.id,
          reset_token_hash,
          expires_at,
          used: false,
          created_at,
        },
      });

      // Note: Sending the reset email containing the rawToken is handled by
      // the platform's mailer/worker. Enqueue or call mailer here if available.
    }

    return { success: true };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
