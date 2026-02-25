import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardAdminTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardAuthAdminJoin(props: {
  body: IEconomicPoliticalDiscussionBoardAdmin.IJoin;
}): Promise<IEconomicPoliticalDiscussionBoardAdmin.IAuthorized> {
  const existing =
    await MyGlobal.prisma.economic_political_discussion_board_admins.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  const hashedPassword = PasswordUtil.hash(props.body.password);
  const admin =
    await MyGlobal.prisma.economic_political_discussion_board_admins.create({
      data: {
        email: props.body.email,
        password_hash: hashedPassword,
        role: "admin",
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...EconomicPoliticalDiscussionBoardAdminTransformer.select(),
    });
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_political_discussion_board_admin_sessions.create(
      {
        data: {
          admin_id: admin.id,
          ip: props.body.ip ?? "0.0.0.0",
          created_at: new Date(),
          expired_at: accessExpires,
        },
      },
    );
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...(await EconomicPoliticalDiscussionBoardAdminTransformer.transform(
      admin,
    )),
    access: token.access,
    refresh: token.refresh,
    admin:
      await EconomicPoliticalDiscussionBoardAdminTransformer.transform(admin),
    token,
  } satisfies IEconomicPoliticalDiscussionBoardAdmin.IAuthorized;
}
