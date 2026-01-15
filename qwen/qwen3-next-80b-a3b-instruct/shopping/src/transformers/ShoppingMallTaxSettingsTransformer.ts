import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallTaxSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTaxSettings";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallTaxSettingsTransformer {
  export type Payload = Prisma.shopping_mall_payment_regionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        country_code: true,
        currency_code: true,
        shopping_mall_payment_surcharge_rules: true,
        paymentMethod: {
          select: {
            configuration: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_regionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallTaxSettings> {
    let config: any = {};
    try {
      if (input.paymentMethod.configuration) {
        const parsed = JSON.parse(input.paymentMethod.configuration);
        if (typeof parsed === "object" && parsed !== null) {
          config = parsed;
        }
      }
    } catch (e) {
      // Silently ignore malformed JSON, use default config
    }
    return {
      enabled: config.enabled === true ? true : false,
      tax_rate: typeof config.tax_rate === "number" ? config.tax_rate : 0,
      tax_type:
        typeof config.tax_type === "string" &&
        ["vat", "gst", "sales_tax", "consumption_tax", "other"].includes(
          config.tax_type,
        )
          ? config.tax_type
          : "other",
      exemptions: Array.isArray(config.exemptions) ? config.exemptions : [],
    };
  }
}
