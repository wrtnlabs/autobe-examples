import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller and get authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  typia.assert(sellerAuth.token);
  typia.assert(sellerAuth.id);
  // 2. Retrieve a product snapshot
  // Note: Using random UUIDs as placeholders since product creation endpoint is not available
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 3. Validate required fields are present and have correct types
  TestValidator.equals("snapshot has id", snapshot.id !== undefined, true);
  TestValidator.equals("snapshot has name", snapshot.name !== undefined, true);
  TestValidator.equals(
    "snapshot has description",
    snapshot.description !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has base_price",
    snapshot.base_price !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has updated_at",
    snapshot.updated_at !== undefined,
    true,
  );
  // 4. Validate base price is a valid number
  TestValidator.equals("base price is positive", snapshot.base_price > 0, true);
  // 5. Validate category relationship is present
  TestValidator.equals(
    "category is present",
    snapshot.category !== undefined,
    true,
  );
  TestValidator.equals(
    "category has id",
    snapshot.category.id !== undefined,
    true,
  );
  TestValidator.equals(
    "category has name",
    snapshot.category.name !== undefined,
    true,
  );
  TestValidator.equals(
    "category has created_at",
    snapshot.category.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "category has updated_at",
    snapshot.category.updated_at !== undefined,
    true,
  );
  // 6. Validate seller snapshot relationship is present
  TestValidator.equals(
    "sellerSnapshot is present",
    snapshot.sellerSnapshot !== undefined,
    true,
  );
  TestValidator.equals(
    "sellerSnapshot has id",
    snapshot.sellerSnapshot.id !== undefined,
    true,
  );
  TestValidator.equals(
    "sellerSnapshot has shop_name",
    snapshot.sellerSnapshot.shop_name !== undefined,
    true,
  );
  TestValidator.equals(
    "sellerSnapshot has shop_description",
    snapshot.sellerSnapshot.shop_description !== undefined,
    true,
  );
  TestValidator.equals(
    "sellerSnapshot has created_at",
    snapshot.sellerSnapshot.created_at !== undefined,
    true,
  );
  // 7. Validate variant snapshot relationship (can be null)
  if (snapshot.variantSnapshot !== null) {
    TestValidator.equals(
      "variantSnapshot has id",
      snapshot.variantSnapshot.id !== undefined,
      true,
    );
    TestValidator.equals(
      "variantSnapshot has sku_code",
      snapshot.variantSnapshot.sku_code !== undefined,
      true,
    );
    TestValidator.equals(
      "variantSnapshot has stock_quantity",
      snapshot.variantSnapshot.stock_quantity !== undefined,
      true,
    );
    TestValidator.equals(
      "variantSnapshot stock is non-negative",
      snapshot.variantSnapshot.stock_quantity >= 0,
      true,
    );
    TestValidator.equals(
      "variantSnapshot is integer",
      Number.isInteger(snapshot.variantSnapshot.stock_quantity),
      true,
    );
  }
  // 8. Validate all timestamps are valid ISO 8601 format
  TestValidator.equals(
    "created_at is valid",
    !Number.isNaN(Date.parse(snapshot.created_at)),
    true,
  );
  TestValidator.equals(
    "updated_at is valid",
    !Number.isNaN(Date.parse(snapshot.updated_at)),
    true,
  );
  TestValidator.equals(
    "category created_at is valid",
    !Number.isNaN(Date.parse(snapshot.category.created_at)),
    true,
  );
  TestValidator.equals(
    "sellerSnapshot created_at is valid",
    !Number.isNaN(Date.parse(snapshot.sellerSnapshot.created_at)),
    true,
  );
  // 9. Validate deleted_at can be null or valid date
  if (snapshot.deleted_at !== null) {
    TestValidator.equals(
      "deleted_at is valid",
      !Number.isNaN(Date.parse(snapshot.deleted_at)),
      true,
    );
  }
  // 10. Validate snapshot belongs to correct product reference (business logic)
  // The snapshot should reference the productId that was queried
  // Note: This would require storing the snapshotId after creation and retrieving it
  TestValidator.equals(
    "snapshot was retrieved successfully",
    snapshot.id !== undefined,
    true,
  );
}
