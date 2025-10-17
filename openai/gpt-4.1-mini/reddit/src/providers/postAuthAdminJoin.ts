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

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ICreate;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  const { body } = props;

  // Check if email already exists
  const existingAdmin =
    await MyGlobal.prisma.reddit_community_admins.findUnique({
      where: { email: body.email },
    });
  if (existingAdmin) {
    throw new HttpException("Email is already registered", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Generate id and timestamps
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const nowMillis = Date.now();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMillis),
  );
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMillis + 3600 * 1000),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMillis + 7 * 24 * 3600 * 1000),
  );

  // Create the new admin user with admin_level 1
  const createdAdmin = await MyGlobal.prisma.reddit_community_admins.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: hashedPassword,
      admin_level: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate JWT Access Token
  const accessToken = jwt.sign(
    {
      userId: createdAdmin.id,
      email: createdAdmin.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate JWT Refresh Token
  const refreshToken = jwt.sign(
    {
      userId: createdAdmin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: createdAdmin.id,
    email: createdAdmin.email,
    password_hash: createdAdmin.password_hash,
    admin_level: createdAdmin.admin_level,
    created_at: toISOStringSafe(createdAdmin.created_at),
    updated_at: toISOStringSafe(createdAdmin.updated_at),
    deleted_at: null,
    reddit_community_report_actions: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
