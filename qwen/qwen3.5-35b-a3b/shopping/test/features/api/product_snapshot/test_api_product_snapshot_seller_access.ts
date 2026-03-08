import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins account and gains authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(sellerAuthorized);
  // 2. Seller retrieves their own product's snapshot
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot: IEcommerceMallProductSnapshot =
    await api.functional.ecommerceMall.products.snapshots.at(sellerConnection, {
      productId,
      snapshotId,
    });
  typia.assert(snapshot);
  // 3. Verify snapshot contains original product data
  TestValidator.equals("snapshot name exists", snapshot.name, snapshot.name);
  TestValidator.predicate(
    "snapshot base price is positive",
    snapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has valid active status",
    snapshot.is_active === true || snapshot.is_active === false,
  );
  // 4. Verify seller information matches authenticated seller
  TestValidator.equals(
    "snapshot seller ID matches authenticated seller",
    snapshot.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "snapshot seller email matches authenticated seller",
    snapshot.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "snapshot seller approval status matches",
    snapshot.seller.approval_status,
    sellerAuthorized.approval_status,
  );
}
