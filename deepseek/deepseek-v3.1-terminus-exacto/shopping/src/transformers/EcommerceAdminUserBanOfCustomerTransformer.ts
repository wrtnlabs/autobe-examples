import { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceMetadataRegistryRelationshipAtSummaryTransformer } from "./EcommerceMetadataRegistryRelationshipAtSummaryTransformer";

export namespace EcommerceAdminUserBanOfCustomerTransformer {
  export type Payload =
    Prisma.ecommerce_administrative_action_of_customersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrativeAction:
          EcommerceMetadataRegistryRelationshipAtSummaryTransformer.select(),
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_administrative_action_of_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminUserBanOfCustomer> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      administrativeAction:
        await EcommerceMetadataRegistryRelationshipAtSummaryTransformer.transform(
          input.administrativeAction,
        ),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
