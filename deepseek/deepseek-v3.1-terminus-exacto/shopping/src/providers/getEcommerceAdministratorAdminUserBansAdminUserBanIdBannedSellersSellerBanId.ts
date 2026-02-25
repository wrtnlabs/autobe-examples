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
import { EcommerceAdminUserBanOfSellerTransformer } from "../transformers/EcommerceAdminUserBanOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorAdminUserBansAdminUserBanIdBannedSellersSellerBanId(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
  sellerBanId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdminUserBanOfSeller> {
  /**
   * Retrieve detailed information about a specific seller banning relationship within an administrative user banning action.
   *
   * This operation validates that the specified seller ban relationship exists and is properly linked to the admin user ban.
   * Only platform administrators with proper authorization can access this sensitive information.
   */
  const sellerBan =
    await MyGlobal.prisma.ecommerce_administrative_action_of_sellers.findUniqueOrThrow(
      {
        where: {
          id: props.sellerBanId,
          ecommerce_administrative_action_id: props.adminUserBanId,
        },
        ...EcommerceAdminUserBanOfSellerTransformer.select(),
      },
    );
  return await EcommerceAdminUserBanOfSellerTransformer.transform(sellerBan);
}
