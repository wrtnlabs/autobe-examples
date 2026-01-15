import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallPaymentMethodConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodConfig";
import { IShoppingMallPaymentMethodSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurchargeRule";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallPaymentMethodSurchargeRuleTransformer } from "./ShoppingMallPaymentMethodSurchargeRuleTransformer";

export namespace ShoppingMallPaymentMethodTransformer {
  export type Payload = Prisma.shopping_mall_payment_methodsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        enabled: true,
        supported_currencies: true,
        regions: true,
        configuration: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_payment_intents: true,
        shopping_mall_payment_regions: true,
        shopping_mall_payment_vault_entries: true,
        shopping_mall_payment_surcharge_rules:
          ShoppingMallPaymentMethodSurchargeRuleTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_payment_methodsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentMethod> {
    // Map string type to enum type based on database value
    let enumType: IShoppingMallPaymentMethod["type"];
    switch (input.type) {
      case "credit_card":
        enumType = "credit_card";
        break;
      case "bank_transfer":
        enumType = "bank_transfer";
        break;
      case "cryptocurrency":
        enumType = "cryptocurrency";
        break;
      case "digital_wallet":
        enumType = "digital_wallet";
        break;
      case "other":
        enumType = "other";
        break;
      default:
        enumType = "other"; // Fallback for unexpected values
    }
    return {
      id: input.id,
      gateway_id: input.gateway_id, // Fixed: was input.id, now input.gateway_id
      display_name: input.name,
      type: enumType, // Fixed: mapped string to enum
      currency: input.supported_currencies,
      is_active: input.enabled,
      is_default: input.enabled, // Note: using enabled as proxy for is_default as no is_default field in schema
      config: input.configuration ? JSON.parse(input.configuration) : undefined,
      region: input.regions,
      surcharge_rules: await ArrayUtil.asyncMap(
        input.shopping_mall_payment_surcharge_rules,
        (rule) =>
          ShoppingMallPaymentMethodSurchargeRuleTransformer.transform(rule),
      ),
    };
  }
}
