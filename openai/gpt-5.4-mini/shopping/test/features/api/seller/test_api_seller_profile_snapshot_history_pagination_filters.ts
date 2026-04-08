import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile snapshot history pagination and filter behavior.
 *
 * Validates that a seller can browse immutable profile snapshots with pagination controls and date/search filters, and that the returned pages remain internally consistent across traversal.
 *
 * This scenario focuses on snapshot-history browsing for storefront profile edits. It verifies pagination metadata, page sizing, and record stability without relying on mutable fields or DTO properties that are not exposed by the API contract.
 *
 * 1. Register and authenticate a seller account.
 * 2. Request the seller profile snapshot history with a small page size and filter controls.
 * 3. Validate pagination metadata and returned snapshot shape.
 * 4. If a second page exists, verify page traversal does not duplicate snapshot records.
 */
export async function test_api_seller_profile_snapshot_history_pagination_filters(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const sellerId = authorized.id;
  const request = {
    page: 1,
    limit: 2,
    search: RandomGenerator.alphabets(3),
    createdAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IMallPlatformSellerProfileSnapshot.IRequest;
  const firstPage =
    await api.functional.mallPlatform.seller.sellers.profile.snapshots.index(
      sellerConnection,
      {
        sellerId,
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length within limit",
    firstPage.data.length <= request.limit,
  );
  TestValidator.predicate(
    "snapshot ids are unique on first page",
    new Set(firstPage.data.map((snapshot) => snapshot.id)).size ===
      firstPage.data.length,
  );
  TestValidator.predicate(
    "snapshot shop names are present",
    firstPage.data.every((snapshot) => snapshot.shopName.length > 0),
  );
  TestValidator.predicate(
    "snapshot descriptions are present",
    firstPage.data.every((snapshot) => snapshot.shopDescription.length > 0),
  );
  TestValidator.predicate(
    "snapshot createdAt values are present",
    firstPage.data.every((snapshot) => snapshot.createdAt.length > 0),
  );
  TestValidator.predicate(
    "snapshot logo uri values are present",
    firstPage.data.every((snapshot) => snapshot.logoImageUri.length > 0),
  );
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.mallPlatform.seller.sellers.profile.snapshots.index(
        sellerConnection,
        {
          sellerId,
          body: { ...request, page: 2 },
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      request.limit,
    );
    TestValidator.predicate(
      "second page data length within limit",
      secondPage.data.length <= request.limit,
    );
    TestValidator.predicate(
      "pages do not duplicate ids",
      secondPage.data.every(
        (snapshot) => !firstPage.data.some((prev) => prev.id === snapshot.id),
      ),
    );
  }
}
