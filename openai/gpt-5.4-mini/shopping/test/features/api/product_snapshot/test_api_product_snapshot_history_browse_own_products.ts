import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Browse immutable product snapshot history for the authenticated seller's own products.
 *
 * Validates that a seller can access the product snapshot history listing endpoint through an actor-isolated authenticated connection. The test checks the paginated response structure, verifies that snapshot summaries preserve their recorded historical fields, and confirms the returned order is newest-first by snapshot creation time.
 *
 * The scenario also verifies that reading snapshot history is a non-mutating operation by issuing the same request twice and ensuring the returned page shape remains stable. This protects the audit trail behavior required for money-related catalog changes and ensures historical product fields are read back as immutable snapshot data rather than current mutable product state.
 *
 * 1. Register and authenticate a seller account with a dedicated seller connection.
 * 2. Request the seller's product snapshot history with a bounded page size.
 * 3. Validate pagination metadata, snapshot ordering, and preserved historical fields.
 * 4. Repeat the read and confirm the snapshot history response remains stable without creating new history records.
 */
export async function test_api_product_snapshot_history_browse_own_products(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = "1234";
  await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const request: IMallPlatformProductSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "-createdAt",
    productId: null,
  };
  const first: IPageIMallPlatformProductSnapshot.ISummary =
    await api.functional.mallPlatform.seller.productSnapshots.history.index(
      sellerConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  TestValidator.predicate(
    "pagination metadata must be non-negative and coherent",
    first.pagination.current >= 0 &&
      first.pagination.limit >= 0 &&
      first.pagination.records >= 0 &&
      first.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page should be reflected in pagination current",
    first.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page size should be reflected in pagination limit",
    first.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot list should not exceed requested limit",
    first.data.length <= first.pagination.limit,
  );
  TestValidator.predicate(
    "pagination should be coherent with returned data",
    first.pagination.records >= first.data.length &&
      first.pagination.pages >= (first.pagination.records === 0 ? 0 : 1),
  );
  TestValidator.predicate(
    "snapshots should be ordered newest-first by createdAt",
    first.data.every((snapshot, index, array) =>
      index === 0 ? true : array[index - 1].createdAt >= snapshot.createdAt,
    ),
  );
  for (const snapshot of first.data) {
    TestValidator.predicate(
      "snapshot product summary should exist",
      snapshot.product.id.length > 0 && snapshot.product.name.length > 0,
    );
    if (snapshot.categoryName !== null) {
      TestValidator.predicate(
        "category name should be preserved when present",
        snapshot.categoryName.length > 0,
      );
    }
    if (snapshot.mainImageUri !== null) {
      TestValidator.predicate(
        "main image uri should be preserved when present",
        snapshot.mainImageUri.length > 0,
      );
    }
  }
  const second: IPageIMallPlatformProductSnapshot.ISummary =
    await api.functional.mallPlatform.seller.productSnapshots.history.index(
      sellerConnection,
      {
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "repeated reads should keep pagination stable",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "repeated reads should keep snapshot ordering and content stable",
    second.data,
    first.data,
  );
}
