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
  body: IEconomicPoliticalBoardAdmin.IJoin;
}): Promise<IEconomicPoliticalBoardAdmin.IAuthorized> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now()),
  );
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const id: string & tags.Format<"uuid"> = v4();
  const adminRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.create({
      data: {
        id,
        user_id: id,
        grade: "regular",
        promoted_at: null,
        created_at: now,
        updated_at: now,
      },
    });
  const payload: Readonly<{
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  }> = {
    type: "admin",
    id: adminRole.user_id,
    session_id: id,
    created_at: now,
  };
  const access: string = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh: string = jwt.sign(
    { ...payload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: adminRole.user_id,
    token,
  } satisfies IEconomicPoliticalBoardAdmin.IAuthorized;
}
