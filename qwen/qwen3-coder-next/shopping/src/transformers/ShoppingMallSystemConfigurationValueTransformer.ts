import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSystemConfigurationAtSummaryTransformer } from "./ShoppingMallSystemConfigurationAtSummaryTransformer";

export namespace ShoppingMallSystemConfigurationValueTransformer {
  export type Payload =
    Prisma.shopping_mall_system_configuration_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        configuration_id: true,
        configuration_name: true,
        value_string: true,
        value_integer: true,
        value_double: true,
        value_boolean: true,
        value_datetime: true,
        seller_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        configuration:
          ShoppingMallSystemConfigurationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_system_configuration_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSystemConfigurationValue> {
    return {
      id: input.id,
      configuration:
        await ShoppingMallSystemConfigurationAtSummaryTransformer.transform(
          input.configuration,
        ),
      configuration_id: input.configuration_id,
      configuration_name: input.configuration_name,
      value_string: input.value_string ?? undefined,
      value_integer: input.value_integer ?? undefined,
      value_double: input.value_double ?? undefined,
      value_boolean: input.value_boolean ?? undefined,
      value_datetime: input.value_datetime
        ? input.value_datetime.toISOString()
        : undefined,
      seller_id: input.seller_id ?? undefined,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : undefined,
    };
  }
}
