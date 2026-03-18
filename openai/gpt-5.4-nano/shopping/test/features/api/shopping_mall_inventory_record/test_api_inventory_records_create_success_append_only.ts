import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_inventory_records_create } from "../../../generate/generate_random_shopping_mall_member_inventory_records_create";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_records_create_success_append_only(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a new member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "P@ssw0rd-" + RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  // 2) Create product and then one variant under that product
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(variant);
  const shoppingMallProductVariantId = variant.id;
  // 3) Append inventory record #1 (coherent non-negative quantities)
  const stockQuantity1 = 10;
  const reservedQuantity1 = 3;
  const availableQuantity1 = stockQuantity1 - reservedQuantity1;
  const record1 =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_variant_id: shoppingMallProductVariantId,
          stock_quantity: stockQuantity1,
          reserved_quantity: reservedQuantity1,
          available_quantity: availableQuantity1,
        },
      },
    );
  typia.assert(record1);
  TestValidator.equals(
    "record1 shopping_mall_product_variant_id",
    record1.shopping_mall_product_variant_id,
    shoppingMallProductVariantId,
  );
  TestValidator.equals(
    "record1 stock_quantity",
    record1.stock_quantity,
    stockQuantity1,
  );
  TestValidator.equals(
    "record1 reserved_quantity",
    record1.reserved_quantity,
    reservedQuantity1,
  );
  TestValidator.equals(
    "record1 available_quantity",
    record1.available_quantity,
    availableQuantity1,
  );
  TestValidator.equals("record1 deleted_at is null", record1.deleted_at, null);
  // 4) Append inventory record #2 for the same variant
  const stockQuantity2 = 15;
  const reservedQuantity2 = 5;
  const availableQuantity2 = stockQuantity2 - reservedQuantity2;
  const record2 =
    await generate_random_shopping_mall_member_inventory_records_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_variant_id: shoppingMallProductVariantId,
          stock_quantity: stockQuantity2,
          reserved_quantity: reservedQuantity2,
          available_quantity: availableQuantity2,
        },
      },
    );
  typia.assert(record2);
  TestValidator.equals(
    "record2 shopping_mall_product_variant_id",
    record2.shopping_mall_product_variant_id,
    shoppingMallProductVariantId,
  );
  TestValidator.equals(
    "record2 stock_quantity",
    record2.stock_quantity,
    stockQuantity2,
  );
  TestValidator.equals(
    "record2 reserved_quantity",
    record2.reserved_quantity,
    reservedQuantity2,
  );
  TestValidator.equals(
    "record2 available_quantity",
    record2.available_quantity,
    availableQuantity2,
  );
  TestValidator.equals("record2 deleted_at is null", record2.deleted_at, null);
  // 5) Append-only invariants
  TestValidator.notEquals(
    "inventory record ids differ",
    record1.id,
    record2.id,
  );
  TestValidator.equals(
    "record1 quantities remain as originally created",
    record1.stock_quantity,
    stockQuantity1,
  );
  TestValidator.equals(
    "record1 reserved_quantity remains as originally created",
    record1.reserved_quantity,
    reservedQuantity1,
  );
  TestValidator.equals(
    "record1 available_quantity remains as originally created",
    record1.available_quantity,
    availableQuantity1,
  );
}
