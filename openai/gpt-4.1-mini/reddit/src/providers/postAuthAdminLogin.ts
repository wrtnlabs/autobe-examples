import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ILogin;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  const { body } = props;

  const admin = await MyGlobal.prisma.reddit_community_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
    include: {
      reddit_community_report_actions: true,
    },
  });

  if (admin === null) {
    throw new HttpException("Unauthorized: Invalid email or password", 401);
  }

  const valid = await PasswordUtil.verify(body.password, admin.password_hash);
  if (!valid) {
    throw new HttpException("Unauthorized: Invalid email or password", 401);
  }

  const payload = {
    id: admin.id,
    email: admin.email,
    admin_level: admin.admin_level,
    type: "admin",
  };

  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    admin_level: admin.admin_level,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    reddit_community_report_actions: admin.reddit_community_report_actions
      ? admin.reddit_community_report_actions.map((action) => ({
          ...action,
          created_at: toISOStringSafe(action.created_at),
          updated_at: toISOStringSafe(action.updated_at),
          deleted_at: action.deleted_at
            ? toISOStringSafe(action.deleted_at)
            : null,
        }))
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
