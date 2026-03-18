import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_product_variant_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_product_variant_snapshots_create";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function test_api_product_variant_snapshot_create_successful_immutable_capture(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Use generator to ensure we have an existing shopping mall product variant id
  const seedSnapshot =
    await generate_random_shopping_mall_admin_product_variant_snapshots_create(
      adminConnection,
      {},
    );
  typia.assert(seedSnapshot);
  const shoppingMallProductVariantId =
    seedSnapshot.shopping_mall_product_variant_id;
  const code = "SKU-" + RandomGenerator.alphabets(10);
  const name = RandomGenerator.name();
  const price = typia.random<number>();
  const currency = "USD";
  const isAvailable = RandomGenerator.pick([true, false] as const);
  const variantStatus = "active_" + RandomGenerator.alphabets(6);
  const body = {
    shopping_mall_product_variant_id: shoppingMallProductVariantId,
    code,
    name,
    price,
    currency,
    is_available: isAvailable,
    variant_status: variantStatus,
  } satisfies IShoppingMallProductVariantSnapshot.ICreate;
  const first =
    await generate_random_shopping_mall_admin_product_variant_snapshots_create(
      adminConnection,
      { body },
    );
  typia.assert(first);
  TestValidator.equals(
    "variant id captured",
    first.shopping_mall_product_variant_id,
    shoppingMallProductVariantId,
  );
  TestValidator.equals("code captured", first.code, code);
  TestValidator.equals("name captured", first.name, name);
  TestValidator.equals("price captured", first.price, price);
  TestValidator.equals("currency captured", first.currency, currency);
  TestValidator.equals(
    "availability captured",
    first.is_available,
    isAvailable,
  );
  TestValidator.equals(
    "variant status captured",
    first.variant_status,
    variantStatus,
  );
  TestValidator.equals("deleted_at is null", first.deleted_at, null);
  const second =
    await generate_random_shopping_mall_admin_product_variant_snapshots_create(
      adminConnection,
      { body },
    );
  typia.assert(second);
  TestValidator.notEquals("snapshot id distinct", first.id, second.id);
  TestValidator.equals(
    "variant id captured second",
    second.shopping_mall_product_variant_id,
    shoppingMallProductVariantId,
  );
  TestValidator.equals("code captured second", second.code, code);
  TestValidator.equals("name captured second", second.name, name);
  TestValidator.equals("price captured second", second.price, price);
  TestValidator.equals("currency captured second", second.currency, currency);
  TestValidator.equals(
    "availability captured second",
    second.is_available,
    isAvailable,
  );
  TestValidator.equals(
    "variant status captured second",
    second.variant_status,
    variantStatus,
  );
  TestValidator.equals("deleted_at is null second", second.deleted_at, null);
}
