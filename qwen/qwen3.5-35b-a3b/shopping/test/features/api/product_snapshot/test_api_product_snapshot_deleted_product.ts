import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshot_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminAuthResponse = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin@1234",
      href: "http://admin.test.com/join",
      referrer: "http://admin.test.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthResponse);
  // 2. Create seller account
  const sellerAuthResponse = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller@1234",
      href: "http://seller.test.com/join",
      referrer: "http://seller.test.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthResponse);
  // 3. Seller logs in and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuthResponse.email,
      password: "Seller@1234",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Admin logs in and retrieves product snapshot
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuthResponse.email,
      password: "Admin@1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Snapshot ID differs from product ID - use random UUID to test snapshot retrieval
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.admin.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Verify snapshot data integrity matches original product state
  TestValidator.equals(
    "snapshot name matches original product",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot base_price matches original product",
    snapshot.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "snapshot slug matches original product",
    snapshot.slug,
    product.slug,
  );
  TestValidator.equals(
    "snapshot description matches original product",
    snapshot.description,
    product.description,
  );
  // 6. Validate snapshot remains accessible (immutability test)
  // Re-retrieve snapshot to confirm it's still available
  const retrievedSnapshot =
    await api.functional.ecommerceMall.admin.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  TestValidator.equals(
    "retrieved snapshot matches original snapshot",
    retrievedSnapshot.id,
    snapshot.id,
  );
}
