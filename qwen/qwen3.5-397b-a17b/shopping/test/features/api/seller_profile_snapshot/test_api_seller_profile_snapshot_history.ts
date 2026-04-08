import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile snapshot history retrieval functionality.
 *
 * Validates the complete snapshot retrieval workflow including seller authentication, snapshot list endpoint access, and response structure validation. Ensures that the snapshot history endpoint returns properly formatted pagination metadata and snapshot records with all required fields.
 *
 * Special attention is given to verifying the snapshot data structure including shop_name, shop_description, logo_image_url, created_at, and the sellerProfile relation. The test also validates pagination metadata correctness and snapshot ordering by creation timestamp.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Seller calls profile snapshots list endpoint to retrieve snapshot history.
 * 3. Validates response structure contains pagination and data array.
 * 4. Validates each snapshot contains required fields with correct types.
 * 5. Validates pagination metadata is correctly populated.
 * 6. Validates snapshots are ordered by created_at descending when multiple exist.
 */
export async function test_api_seller_profile_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Retrieve profile snapshot history
  const snapshotResponse =
    await api.functional.shoppingMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page >= 1",
    snapshotResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit between 1-100",
    snapshotResponse.pagination.limit >= 1 &&
      snapshotResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records >= 0",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", snapshotResponse.pagination.pages >= 0);
  // 4. Validate data array exists
  TestValidator.predicate(
    "data is array",
    Array.isArray(snapshotResponse.data),
  );
  // 5. Validate each snapshot structure
  for (const snapshot of snapshotResponse.data) {
    // Validate shop_name is non-empty string
    TestValidator.predicate(
      "shop_name not empty",
      snapshot.shop_name.length > 0,
    );
    // Validate shop_description exists
    TestValidator.predicate(
      "shop_description is string",
      typeof snapshot.shop_description === "string",
    );
    // Validate logo_image_url null check (business logic, not type validation)
    if (snapshot.logo_image_url !== null) {
      TestValidator.predicate(
        "logo_image_url is non-empty when present",
        snapshot.logo_image_url.length > 0,
      );
    }
    // Validate sellerProfile relation exists
    TestValidator.predicate(
      "sellerProfile exists",
      snapshot.sellerProfile !== undefined,
    );
    // Validate sellerProfile.seller.email matches the authenticated seller
    TestValidator.predicate(
      "sellerProfile seller email matches seller",
      snapshot.sellerProfile.seller.email === sellerAuth.email,
    );
  }
  // 6. Validate snapshots are ordered by created_at descending (most recent first)
  if (snapshotResponse.data.length > 1) {
    for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
      const current = new Date(snapshotResponse.data[i].created_at).getTime();
      const next = new Date(snapshotResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
        current >= next,
      );
    }
  }
  // 7. Validate pagination pages calculation
  const expectedPages =
    snapshotResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          snapshotResponse.pagination.records /
            snapshotResponse.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation correct",
    snapshotResponse.pagination.pages,
    expectedPages,
  );
}
