import { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
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
import { EcommerceAdminUserBanOfAdministratorTransformer } from "../transformers/EcommerceAdminUserBanOfAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorAdminUserBansAdminUserBanIdAdministratorBansAdministratorBanId(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
  administratorBanId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdminUserBanOfAdministrator> {
  const banRelationship =
    await MyGlobal.prisma.ecommerce_admin_user_ban_of_administrators.findUniqueOrThrow(
      {
        where: {
          admin_user_ban_id_administrator_id: {
            admin_user_ban_id: props.adminUserBanId,
            administrator_id: props.administratorBanId,
          },
        },
        ...EcommerceAdminUserBanOfAdministratorTransformer.select(),
      },
    );
  return await EcommerceAdminUserBanOfAdministratorTransformer.transform(
    banRelationship,
  );
}
