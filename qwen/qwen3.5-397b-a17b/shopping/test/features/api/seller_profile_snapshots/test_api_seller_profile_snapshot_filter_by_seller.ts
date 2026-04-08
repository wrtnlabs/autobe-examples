import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering seller profile snapshots by specific seller profile ID to track change history for one seller.
 *
 * Validates the complete seller profile snapshot filtering workflow including administrator authentication, filtered queries by seller profile ID, and response validation. Ensures that the filtering mechanism correctly restricts results to snapshots belonging to the specified seller profile.
 *
 * Special attention is given to verifying that all returned snapshots have matching sellerProfile.id values, chronological ordering is maintained (created_at descending), and pagination metadata is accurate.
 *
 * 1. Administrator authenticates via /shoppingMall/auth/admin/join with randomized credentials.
 * 2. Administrator queries seller profile snapshots with sellerProfileId filter set to a target seller's profile ID.
 * 3. Validates response structure contains pagination metadata and data array.
 * 4. Verifies all returned snapshots have sellerProfile.id matching the filter criteria.
 * 5. Verifies snapshots are ordered chronologically by created_at in descending order.
 * 6. Tests filtering with different sellerProfileId values to ensure isolation.
 * 7. Validates pagination metadata accuracy (current, limit, records, pages).
 */
export async function test_api_seller_profile_snapshot_filter_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Query snapshots without filter to get existing seller profile IDs
  const allSnapshots =
    await api.functional.shoppingMall.admin.admin.seller_profile_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    allSnapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(allSnapshots.data),
  );
  TestValidator.predicate(
    "current page is 1",
    allSnapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is within expected range",
    allSnapshots.pagination.limit > 0 && allSnapshots.pagination.limit <= 100,
  );
  // 4. If there are snapshots, test filtering by sellerProfileId
  if (allSnapshots.data.length > 0) {
    // Get unique seller profile IDs from the results
    const sellerProfileIds = [
      ...new Set(
        allSnapshots.data.map((snapshot) => snapshot.sellerProfile.id),
      ),
    ];
    // Test filtering for each unique seller profile ID
    for (const sellerProfileId of sellerProfileIds) {
      const filteredResponse =
        await api.functional.shoppingMall.admin.admin.seller_profile_snapshots.index(
          adminConnection,
          {
            body: {
              sellerProfileId: sellerProfileId,
              page: 1,
              limit: 50,
            } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
          },
        );
      typia.assert(filteredResponse);
      // 5. Verify all snapshots belong to the filtered seller profile
      TestValidator.predicate(
        "all snapshots match sellerProfileId filter",
        filteredResponse.data.every(
          (snapshot) => snapshot.sellerProfile.id === sellerProfileId,
        ),
      );
      // 6. Verify chronological ordering (created_at descending)
      if (filteredResponse.data.length > 1) {
        for (let i = 1; i < filteredResponse.data.length; i++) {
          const prevDate = new Date(
            filteredResponse.data[i - 1].created_at,
          ).getTime();
          const currDate = new Date(
            filteredResponse.data[i].created_at,
          ).getTime();
          TestValidator.predicate(
            `snapshot ${i} is older than or equal to snapshot ${i - 1}`,
            prevDate >= currDate,
          );
        }
      }
      // 7. Validate pagination metadata for filtered results
      TestValidator.predicate(
        "filtered pagination current is 1",
        filteredResponse.pagination.current === 1,
      );
      TestValidator.predicate(
        "filtered pagination limit is 50",
        filteredResponse.pagination.limit === 50,
      );
      TestValidator.predicate(
        "records count matches or exceeds data length",
        filteredResponse.pagination.records >= filteredResponse.data.length,
      );
      // 8. Validate snapshot business data (not type validation - typia.assert handles types)
      if (filteredResponse.data.length > 0) {
        const snapshot = filteredResponse.data[0];
        TestValidator.predicate(
          "snapshot has non-empty shop_name",
          snapshot.shop_name.length > 0,
        );
        TestValidator.predicate(
          "snapshot has non-empty shop_description",
          snapshot.shop_description.length > 0,
        );
      }
    }
    // 9. Test with non-existent seller profile ID (should return empty or valid response)
    const nonExistentId = typia.random<string & tags.Format<"uuid">>();
    const emptyResponse =
      await api.functional.shoppingMall.admin.admin.seller_profile_snapshots.index(
        adminConnection,
        {
          body: {
            sellerProfileId: nonExistentId,
            page: 1,
            limit: 20,
          } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(emptyResponse);
    // Should return valid structure even with no results
    TestValidator.predicate(
      "empty response has valid structure",
      emptyResponse.pagination !== undefined &&
        Array.isArray(emptyResponse.data),
    );
    TestValidator.predicate(
      "empty response data is empty array",
      emptyResponse.data.length === 0,
    );
  } else {
    // No snapshots exist in the system - test with random sellerProfileId
    const randomSellerProfileId = typia.random<string & tags.Format<"uuid">>();
    const emptyResponse =
      await api.functional.shoppingMall.admin.admin.seller_profile_snapshots.index(
        adminConnection,
        {
          body: {
            sellerProfileId: randomSellerProfileId,
            page: 1,
            limit: 20,
          } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(emptyResponse);
    TestValidator.predicate(
      "empty system response has valid structure",
      emptyResponse.pagination !== undefined &&
        Array.isArray(emptyResponse.data) &&
        emptyResponse.data.length === 0,
    );
  }
}
