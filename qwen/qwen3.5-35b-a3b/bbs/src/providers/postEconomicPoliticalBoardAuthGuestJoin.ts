import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
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

export async function postEconomicPoliticalBoardAuthGuestJoin(props: {
  body: IEconomicPoliticalBoardGuest.IJoin;
}): Promise<IEconomicPoliticalBoardGuest.IAuthorized> {
  // Note: This operation requires User and Profile tables which do not exist in the schema.
  // The economic_political_board_administrator_roles table is for administrators only.
  // Cannot implement registration without User table.
  throw new HttpException(
    "User table not available - registration not supported",
    501,
  );
}
