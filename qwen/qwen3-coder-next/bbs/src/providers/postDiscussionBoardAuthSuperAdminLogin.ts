import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthSuperAdminLogin(props: {
  body: IDiscussionBoardSuperAdmin.ILogin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        processedAdministratorRequests: true,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const createdAt = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_super_admin_id: superAdmin.id,
        access_token: "temp",
        refresh_token: "temp",
        ip: "",
        href: "",
        referrer: "",
        created_at: createdAt,
        expired_at: accessExpiresAt,
      },
    });
  const accessPayload = {
    type: "superAdmin",
    id: superAdmin.id,
    session_id: session.id,
    created_at: createdAt,
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshPayload = {
    ...accessPayload,
    tokenType: "refresh",
  };
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  const transformed =
    await DiscussionBoardSuperAdminAtSummaryTransformer.transform(superAdmin);
  return {
    ...transformed,
    token,
    authorizationActor: "superAdmin",
  } satisfies IDiscussionBoardSuperAdmin.IAuthorized;
}
