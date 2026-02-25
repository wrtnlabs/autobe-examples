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

export namespace EcommerceAdminUserBanOfAdministratorAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_administrative_action_of_productsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_details: true,
        previous_state: true,
        new_state: true,
        administrativeAction:
          EcommerceMetadataRegistryRelationshipAtSummaryTransformer.select(),
        product: EcommerceProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_administrative_action_of_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminUserBanOfAdministrator.ISummary> {
    return {
      id: input.id,
      actionDetails: input.action_details ?? null,
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.product,
      ),
      administrativeAction:
        await EcommerceMetadataRegistryRelationshipAtSummaryTransformer.transform(
          input.administrativeAction,
        ),
    };
  }
}
