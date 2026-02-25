import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSaleAtSummaryTransformer } from "./ShoppingMallSaleAtSummaryTransformer";

export namespace ShoppingMallSaleSpecificationAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sale_specificationsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleSpecification.ISummary> {
    return {
      id: input.id,
      specificationKey: input.specification_key,
      specificationValue: input.specification_value,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      shoppingMallSale: await ShoppingMallSaleAtSummaryTransformer.transform(
        input.shoppingMallSale,
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        specification_key: true,
        specification_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shoppingMallSale: ShoppingMallSaleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_sale_specificationsFindManyArgs;
  }
}
