import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_variant_snapshots_create } from "../../../generate/generate_random_shopping_mall_member_product_variant_snapshots_create";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function test_api_product_variant_snapshot_creation_captures_availability_and_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const variantA: IShoppingMallProductVariant =
    await generate_random_shopping_mall_member_product_variants_create(
      memberConnection,
      {},
    );
  typia.assert(variantA);
  const snapshot1Input = {
    shopping_mall_product_variant_id: variantA.id,
    code: `SNAP1-${RandomGenerator.alphabets(10)}`,
    name: `Snapshot One ${RandomGenerator.name(2)}`,
    price: typia.random<number>() + 1000,
    currency: "USD",
    is_available: false,
    variant_status: `DISABLED-${RandomGenerator.alphabets(8)}`,
  } satisfies IShoppingMallProductVariantSnapshot.ICreate;
  const snapshot1: IShoppingMallProductVariantSnapshot =
    await generate_random_shopping_mall_member_product_variant_snapshots_create(
      memberConnection,
      { body: snapshot1Input },
    );
  typia.assert(snapshot1);
  TestValidator.equals(
    "snapshot1 variant id matches",
    snapshot1.shopping_mall_product_variant_id,
    variantA.id,
  );
  TestValidator.equals("snapshot1 is_available", snapshot1.is_available, false);
  TestValidator.equals(
    "snapshot1 variant_status captured",
    snapshot1.variant_status,
    snapshot1Input.variant_status,
  );
  TestValidator.equals(
    "snapshot1 code captured",
    snapshot1.code,
    snapshot1Input.code,
  );
  TestValidator.equals(
    "snapshot1 name captured",
    snapshot1.name,
    snapshot1Input.name,
  );
  TestValidator.equals(
    "snapshot1 price captured",
    snapshot1.price,
    snapshot1Input.price,
  );
  TestValidator.equals(
    "snapshot1 currency captured",
    snapshot1.currency,
    snapshot1Input.currency,
  );
  const snapshot2Input = {
    shopping_mall_product_variant_id: variantA.id,
    code: `SNAP2-${RandomGenerator.alphabets(10)}`,
    name: `Snapshot Two ${RandomGenerator.name(2)}`,
    price: typia.random<number>() + 2000,
    currency: "KRW",
    is_available: true,
    variant_status: `AVAILABLE-${RandomGenerator.alphabets(8)}`,
  } satisfies IShoppingMallProductVariantSnapshot.ICreate;
  const snapshot2: IShoppingMallProductVariantSnapshot =
    await generate_random_shopping_mall_member_product_variant_snapshots_create(
      memberConnection,
      { body: snapshot2Input },
    );
  typia.assert(snapshot2);
  TestValidator.notEquals("snapshot ids differ", snapshot1.id, snapshot2.id);
  TestValidator.equals("snapshot2 is_available", snapshot2.is_available, true);
  TestValidator.equals(
    "snapshot2 variant_status captured",
    snapshot2.variant_status,
    snapshot2Input.variant_status,
  );
  TestValidator.equals(
    "snapshot2 code captured",
    snapshot2.code,
    snapshot2Input.code,
  );
  TestValidator.equals(
    "snapshot2 name captured",
    snapshot2.name,
    snapshot2Input.name,
  );
  TestValidator.equals(
    "snapshot2 price captured",
    snapshot2.price,
    snapshot2Input.price,
  );
  TestValidator.equals(
    "snapshot2 currency captured",
    snapshot2.currency,
    snapshot2Input.currency,
  );
}
