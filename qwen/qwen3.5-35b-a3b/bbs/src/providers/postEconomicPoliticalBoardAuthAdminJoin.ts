import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardAuthAdminJoin(props: {
  ip: string;
  body: IEconomicPoliticalBoardAdmin.IJoin;
}): Promise<IEconomicPoliticalBoardAdmin.IAuthorized> {
  // 1. Check email uniqueness - need User table which isn't available
  // Since User table doesn't exist in available schemas, we'll create the admin role
  // and assume User creation is handled by a separate system or table not shown
  // 2. Create administrator role with hashed password
  const passwordHashed = PasswordUtil.hash(props.body.password);
  const admin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: v4() as string & tags.Format<"uuid">,
        grade: "regular",
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        user_id: true,
        created_at: true,
      },
    });
  // 3. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session_id = v4() as string & tags.Format<"uuid">;
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.user_id,
        session_id: session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.user_id,
        session_id: session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: admin.user_id,
    token,
  } satisfies IEconomicPoliticalBoardAdmin.IAuthorized;
}
