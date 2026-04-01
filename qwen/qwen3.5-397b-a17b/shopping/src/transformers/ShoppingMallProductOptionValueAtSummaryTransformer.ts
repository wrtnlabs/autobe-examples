import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductOptionDefinitionAtSummaryTransformer } from "./ShoppingMallProductOptionDefinitionAtSummaryTransformer";

export namespace ShoppingMallProductOptionValueAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_option_valuesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        optionDefinition:
          ShoppingMallProductOptionDefinitionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductOptionValue.ISummary> {
    return {
      id: input.id,
      name: input.name,
      optionDefinition:
        await ShoppingMallProductOptionDefinitionAtSummaryTransformer.transform(
          input.optionDefinition,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
