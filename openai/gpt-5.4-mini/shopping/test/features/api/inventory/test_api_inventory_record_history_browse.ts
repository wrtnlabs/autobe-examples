import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const page =
    await api.functional.shoppingMall.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        productVariantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("page current", page.pagination.current, 1);
  TestValidator.equals("page limit", page.pagination.limit, 100);
  TestValidator.predicate(
    "page records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "inventory history is array",
    Array.isArray(page.data),
  );
  TestValidator.predicate(
    "every record has the same variant summary shape",
    page.data.every((record) => {
      const variant = record.productVariant;
      return (
        typeof variant.id === "string" &&
        typeof variant.skuCode === "string" &&
        typeof variant.overridePrice !== "undefined" &&
        typeof variant.stockQuantity === "number" &&
        typeof variant.createdAt === "string" &&
        typeof variant.updatedAt === "string" &&
        (variant.deletedAt === null || typeof variant.deletedAt === "string")
      );
    }),
  );
  TestValidator.predicate(
    "every record has valid inventory history fields",
    page.data.every(
      (record) =>
        typeof record.id === "string" &&
        Number.isInteger(record.quantityChange) &&
        typeof record.reason === "string" &&
        typeof record.occurredAt === "string" &&
        typeof record.createdAt === "string" &&
        typeof record.updatedAt === "string" &&
        (record.deletedAt === null || typeof record.deletedAt === "string"),
    ),
  );
  TestValidator.predicate(
    "history is ordered newest-first by occurredAt and createdAt",
    page.data.every(
      (record, index, array) =>
        index === 0 ||
        array[index - 1].occurredAt >= record.occurredAt ||
        (array[index - 1].occurredAt === record.occurredAt &&
          array[index - 1].createdAt >= record.createdAt),
    ),
  );
}
