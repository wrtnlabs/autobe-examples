import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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

/**
 * [Original Description]
 *
 * Cannot implement: Schema missing email, password, display_name, bio fields required by API.
 */
export async function postEconomicBoardAuthAdministratorJoin(props: {
  body: IEconomicBoardAdministrator.IJoin;
}): Promise<IEconomicBoardAdministrator.IAuthorized> {
  return typia.random<IEconomicBoardAdministrator.IAuthorized>();
}
