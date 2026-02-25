import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceVariantSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_variant_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        operation_type: true,
        change_reason: true,
        previous_sku: true,
        current_sku: true,
        previous_price: true,
        current_price: true,
        previous_option_values: true,
        current_option_values: true,
        previous_stock_quantity: true,
        current_stock_quantity: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
        variant: {
          select: { id: true },
        } satisfies Prisma.ecommerce_product_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceVariantSnapshot.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      operation_type: input.operation_type,
      change_reason: input.change_reason,
      customer: input.customer
        ? await EcommerceCustomerAtSummaryTransformer.transform(input.customer)
        : undefined,
      seller: input.seller
        ? await EcommerceSellerAtSummaryTransformer.transform(input.seller)
        : undefined,
      administrator: input.administrator
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : undefined,
      previous_sku: input.previous_sku,
      current_sku: input.current_sku,
      previous_price: input.previous_price,
      current_price: input.current_price,
    };
  }
}
