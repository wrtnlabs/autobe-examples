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

export async function test_api_product_snapshot_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<(string & tags.Format<"uri">)>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  // 2. Generate random snapshot identifiers for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Access the product snapshot using seller's authenticated connection
  const snapshot: IEcommerceMallProductSnapshot =
    await api.functional.ecommerceMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and required fields
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.equals(
    "product reference matches request",
    snapshot.product.id,
    productId,
  );
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate("snapshot has slug", snapshot.slug.length > 0);
  TestValidator.predicate(
    "snapshot has positive base price",
    snapshot.base_price > 0,
  );
  TestValidator.predicate("snapshot has status", snapshot.status.length > 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    snapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    snapshot.updated_at !== undefined,
  );
  // Validate optional fields if present
  if (snapshot.description !== undefined && snapshot.description !== null) {
    TestValidator.predicate(
      "description has content when provided",
      snapshot.description.length > 0,
    );
  }
  if (snapshot.sale_price !== undefined && snapshot.sale_price !== null) {
    TestValidator.predicate(
      "sale price is positive when provided",
      snapshot.sale_price > 0,
    );
  }
  if (snapshot.tags !== undefined && snapshot.tags !== null) {
    TestValidator.predicate(
      "tags has content when provided",
      snapshot.tags.length > 0,
    );
  }
}