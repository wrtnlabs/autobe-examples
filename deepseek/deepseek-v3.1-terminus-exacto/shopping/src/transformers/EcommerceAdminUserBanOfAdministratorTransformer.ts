import { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMetadataRegistryRelationshipAtSummaryTransformer } from "./EcommerceMetadataRegistryRelationshipAtSummaryTransformer";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";

export namespace EcommerceAdminUserBanOfAdministratorTransformer {
  export type Payload =
    Prisma.ecommerce_admin_user_ban_of_administratorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        adminUserBan:
          EcommerceMetadataRegistryRelationshipAtSummaryTransformer.select(),
        administrator: EcommerceProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_admin_user_ban_of_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminUserBanOfAdministrator> {
    return {
      id: input.id,
      administrative_action_id: input.adminUserBan.id,
      product_id: input.administrator.id,
      action_details: null,
      previous_state: null,
      new_state: null,
      administrativeAction:
        await EcommerceMetadataRegistryRelationshipAtSummaryTransformer.transform(
          input.adminUserBan,
        ),
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.administrator,
      ),
    };
  }
}
