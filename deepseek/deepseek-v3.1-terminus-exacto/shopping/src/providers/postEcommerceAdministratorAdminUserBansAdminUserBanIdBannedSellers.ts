import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorAdminUserBansAdminUserBanIdBannedSellers(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfSeller.ICreate;
}): Promise<IEcommerceAdminUserBanOfSeller> {
  // Need clarification on seller ID source
  throw new HttpException(
    "Implementation requires seller ID source clarification",
    400,
  );
}
