import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminUserPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordResetRequest";
import { ICommunityPlatformAdminUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordReset";

export async function postAuthAdminUserPasswordReset(props: {
  body: ICommunityPlatformAdminUserPasswordResetRequest.ICreate;
}): Promise<ICommunityPlatformAdminUserPasswordReset.ISummary> {
  const email = props.body?.email;
  const username = props.body?.username;

  if (email == null && username == null) {
    throw new HttpException("Unable to process password reset request", 400);
  }

  const user = await (async () => {
    if (email != null) {
      return await MyGlobal.prisma.community_platform_users.findFirst({
        where: {
          email: email,
          deleted_at: null,
        },
      });
    }
    return await MyGlobal.prisma.community_platform_users.findFirst({
      where: {
        username: username,
        deleted_at: null,
      },
    });
  })();

  if (!user) {
    throw new HttpException("Unable to process password reset request", 404);
  }

  const adminAssignment =
    await MyGlobal.prisma.community_platform_admin_users.findFirst({
      where: {
        community_platform_user_id: user.id,
        deleted_at: null,
        revoked_at: null,
      },
    });

  if (!adminAssignment) {
    throw new HttpException("Unable to process password reset request", 404);
  }

  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      account_state: "PasswordResetRequired",
      updated_at: nowIso,
    },
  });

  const token = jwt.sign(
    {
      sub: user.id,
      jti: v4(),
      scope: "admin_password_reset",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m" },
  );
  void token;

  return { status: "reset_sent" };
}
