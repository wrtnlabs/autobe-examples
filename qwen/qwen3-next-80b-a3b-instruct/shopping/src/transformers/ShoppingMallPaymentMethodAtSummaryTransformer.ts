import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentMethodAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_methodsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        type: true,
        supported_currencies: true,
        regions: true,
        configuration: true,
        enabled: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_payment_intents: true,
        shopping_mall_payment_regions: true,
        shopping_mall_payment_vault_entries: true,
        shopping_mall_payment_surcharge_rules: true,
      },
    } satisfies Prisma.shopping_mall_payment_methodsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentMethod.ISummary> {
    // Parse JSON string fields
    const configuration = JSON.parse(input.configuration);
    const supportedCurrencies = JSON.parse(input.supported_currencies);
    const regions = JSON.parse(input.regions);
    // Map to DTO
    return {
      id: input.id,
      name: input.name,
      payment_processor: input.type,
      supported_currencies: supportedCurrencies.map((item: string) =>
        item.trim(),
      ) as (string &
        tags.MinLength<3> &
        tags.MaxLength<3> &
        tags.Pattern<"^[A-Z]{3}$">)[],
      region_restriction: regions.map((item: string) =>
        item.trim(),
      ) as (string &
        tags.MinLength<2> &
        tags.MaxLength<2> &
        tags.Pattern<"^[A-Z]{2}$">)[],
      minimum_amount: configuration.minimum,
      maximum_amount: configuration.maximum,
      processing_fee_percent: configuration.fee_percent,
      processing_fee_fixed: configuration.fee_fixed,
      is_active: input.enabled,
      icon_url: configuration.icon_url,
      display_priority: configuration.display_priority,
    };
  }
}
