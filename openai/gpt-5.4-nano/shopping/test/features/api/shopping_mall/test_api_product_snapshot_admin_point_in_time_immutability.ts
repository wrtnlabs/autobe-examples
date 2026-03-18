import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_product_snapshots_create } from "../../../generate/generate_random_shopping_mall_member_product_snapshots_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_snapshot";

export async function test_api_product_snapshot_admin_point_in_time_immutability(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });

  await authorize_member_login(memberConnection, {
    body: {
      email: memberAuthorized.email,
      password:
        (
          memberAuthorized as unknown as {
            password?: string;
          }
        ).password ?? RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.ILogin,
  });

  const product = await generate_random_shopping_mall_member_products_create_product(
    memberConnection,
    {
      body: typia.assert(
        prepare_random_shopping_mall_product() satisfies IShoppingMallProduct.ICreate,
      ),
    },
  );
  typia.assert(product);

  const snapshot =
    await generate_random_shopping_mall_member_product_snapshots_create(
      memberConnection,
      {
        body: {
          snapshot_code: RandomGenerator.alphaNumeric(14),
          source_type: "product_update",
          source_entity_id: product.id,
          source_seller_id: product.shopping_mall_seller_id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallProductSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  const snap1 = await api.functional.shoppingMall.admin.productSnapshots.at(
    adminConnection,
    {
      productSnapshotId: snapshot.id,
    },
  );
  typia.assert(snap1);

  const updated = await api.functional.shoppingMall.member.products.update(
    memberConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_featured: !product.is_featured,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(updated);

  const snap2 = await api.functional.shoppingMall.admin.productSnapshots.at(
    adminConnection,
    {
      productSnapshotId: snapshot.id,
    },
  );
  typia.assert(snap2);

  TestValidator.equals("snapshot id stable", snap2.id, snap1.id);
  TestValidator.equals(
    "snapshot_code stable",
    snap2.snapshot_code,
    snap1.snapshot_code,
  );
  TestValidator.equals(
    "snapshot_name stable",
    snap2.snapshot_name,
    snap1.snapshot_name,
  );
  TestValidator.equals(
    "snapshot_description stable",
    snap2.snapshot_description,
    snap1.snapshot_description,
  );
  TestValidator.equals(
    "snapshot_category_id stable",
    snap2.snapshot_category_id,
    snap1.snapshot_category_id,
  );
  TestValidator.equals(
    "seller stable",
    snap2.snapshot_seller_id,
    snap1.snapshot_seller_id,
  );
  TestValidator.equals(
    "display_price stable",
    snap2.display_price,
    snap1.display_price,
  );
  TestValidator.equals("is_listed stable", snap2.is_listed, snap1.is_listed);
  TestValidator.equals(
    "product id stable",
    snap2.shopping_mall_product_id,
    snap1.shopping_mall_product_id,
  );
  TestValidator.equals(
    "snapshot_name historical",
    snap1.snapshot_name,
    product.name,
  );
  TestValidator.equals(
    "snapshot_description historical",
    snap1.snapshot_description,
    product.description,
  );
}
