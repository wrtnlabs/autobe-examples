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
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function test_api_product_variant_snapshot_creation_happy_path(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);

  const product = await generate_random_shopping_mall_member_products_create_product(
    memberConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    } satisfies any,
  );
  typia.assert(product);

  const variant = await generate_random_shopping_mall_member_product_variants_create(
    memberConnection,
    {
      body: typia.assert<IShoppingMallProductVariant.ICreate>({
        shopping_mall_product_id: product.id,
      } as any),
    },
  );
  typia.assert(variant);

  const snapshot1Body = {
    shopping_mall_product_variant_id: variant.id,
    code: `SNAP-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
    name: RandomGenerator.name(),
    price: typia.random<number>(),
    currency: typia.random<string>(),
    is_available: true,
    variant_status: typia.random<string>(),
  } satisfies IShoppingMallProductVariantSnapshot.ICreate;

  const snapshot1 =
    await generate_random_shopping_mall_member_product_variant_snapshots_create(
      memberConnection,
      {
        body: snapshot1Body,
      },
    );
  typia.assert(snapshot1);

  const snapshot2Body = {
    shopping_mall_product_variant_id: variant.id,
    code: `SNAP-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
    name: RandomGenerator.name(),
    price: typia.random<number>(),
    currency: typia.random<string>(),
    is_available: false,
    variant_status: typia.random<string>(),
  } satisfies IShoppingMallProductVariantSnapshot.ICreate;

  const snapshot2 =
    await generate_random_shopping_mall_member_product_variant_snapshots_create(
      memberConnection,
      {
        body: snapshot2Body,
      },
    );
  typia.assert(snapshot2);

  TestValidator.notEquals(
    "snapshot ids should differ",
    snapshot1.id,
    snapshot2.id,
  );
  TestValidator.equals("snapshot1 code", snapshot1.code, snapshot1Body.code);
  TestValidator.equals("snapshot1 name", snapshot1.name, snapshot1Body.name);
  TestValidator.equals("snapshot1 price", snapshot1.price, snapshot1Body.price);
  TestValidator.equals(
    "snapshot1 currency",
    snapshot1.currency,
    snapshot1Body.currency,
  );
  TestValidator.equals(
    "snapshot1 availability",
    snapshot1.is_available,
    snapshot1Body.is_available,
  );
  TestValidator.equals(
    "snapshot1 status",
    snapshot1.variant_status,
    snapshot1Body.variant_status,
  );
  TestValidator.equals(
    "snapshot1 deleted_at is null",
    snapshot1.deleted_at,
    null,
  );
  TestValidator.equals("snapshot2 code", snapshot2.code, snapshot2Body.code);
  TestValidator.equals("snapshot2 name", snapshot2.name, snapshot2Body.name);
  TestValidator.equals("snapshot2 price", snapshot2.price, snapshot2Body.price);
  TestValidator.equals(
    "snapshot2 currency",
    snapshot2.currency,
    snapshot2Body.currency,
  );
  TestValidator.equals(
    "snapshot2 availability",
    snapshot2.is_available,
    snapshot2Body.is_available,
  );
  TestValidator.equals(
    "snapshot2 status",
    snapshot2.variant_status,
    snapshot2Body.variant_status,
  );
  TestValidator.equals(
    "snapshot2 deleted_at is null",
    snapshot2.deleted_at,
    null,
  );
}
