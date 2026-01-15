import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { IShoppingMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentConfig";
import { IShoppingMallShippingConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingConfig";
import { IShoppingMallCatalogConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogConfig";
import { IShoppingMallSecurityConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityConfig";
import { IShoppingMallFeatureConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFeatureConfig";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallConfigurationTransformer {
  export type Payload = Prisma.shopping_mall_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        type: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IShoppingMallConfiguration> {
    const configMap: Record<string, any> = {};
    // Build a map of key-value pairs from all returned rows
    for (const row of input) {
      configMap[row.key] = JSON.parse(row.value);
    }
    // Transform into IShoppingMallConfiguration structure
    return {
      payment: configMap.payment || {},
      shipping: configMap.shipping || {},
      catalog: configMap.catalog || {},
      security: configMap.security || {},
      features: configMap.features || {},
    };
  }
}
