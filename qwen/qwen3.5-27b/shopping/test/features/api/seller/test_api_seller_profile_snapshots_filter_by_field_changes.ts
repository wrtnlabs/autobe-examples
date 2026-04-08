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
 * Test that a seller can filter profile snapshots by specific field changes.
 *
 * Validates the seller profile snapshot filtering functionality by testing various filter combinations on the PATCH /shoppingMall/seller/profile/snapshots endpoint. Ensures that the changed_fields filter correctly returns snapshots where the specified fields were modified, and that date range filtering works as expected.
 *
 * The test registers a new seller account, then validates filtering by single field, multiple fields, and date ranges. Each snapshot should contain the correct before/after values for the modified fields. The test handles cases where snapshots may or may not exist, validating the API response structure and filtering behavior.
 *
 * 1. Register a new seller account via POST /shoppingMall/auth/seller/join
 * 2. Test filtering by single field (shop_name) - verify API returns correctly structured response
 * 3. Test filtering by multiple fields (shop_name, shop_description) - verify OR logic
 * 4. Test date range filtering with created_at_from and created_at_to
 * 5. Verify snapshot structure, pagination metadata, and data integrity
 * 6. Validate that returned snapshots match the specified filter criteria
 */
export async function test_api_seller_profile_snapshots_filter_by_field_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Test filtering by single field (shop_name)
  const shopNameFilterResult =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          changed_fields: ["shop_name"] as const,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(shopNameFilterResult);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    shopNameFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    shopNameFilterResult.pagination.limit >= 1 &&
      shopNameFilterResult.pagination.limit <= 100,
  );
  // Verify that returned snapshots (if any) contain shop_name changes
  await ArrayUtil.asyncForEach(shopNameFilterResult.data, async (snapshot) => {
    typia.assert(snapshot);
    // At least one of shop_name_before or shop_name_after should be non-null
    // This confirms the snapshot was created when shop_name was modified
    TestValidator.predicate(
      "shop_name field was modified in this snapshot",
      snapshot.shop_name_before !== null || snapshot.shop_name_after !== null,
    );
    // Verify seller profile relation exists and is valid
    typia.assert(snapshot.sellerProfile);
    TestValidator.predicate(
      "seller profile has valid ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.sellerProfile.id,
      ),
    );
    // Verify created_at is valid date-time format
    TestValidator.predicate(
      "created_at is valid ISO 8601 date-time",
      !isNaN(Date.parse(snapshot.created_at)),
    );
  });
  // 3. Test filtering by multiple fields (shop_name, shop_description)
  const multiFieldFilterResult =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          changed_fields: ["shop_name", "shop_description"] as const,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(multiFieldFilterResult);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination structure is consistent",
    multiFieldFilterResult.pagination.current,
    shopNameFilterResult.pagination.current,
  );
  // Verify that returned snapshots (if any) contain shop_name or shop_description changes
  await ArrayUtil.asyncForEach(
    multiFieldFilterResult.data,
    async (snapshot) => {
      typia.assert(snapshot);
      // At least one of the specified fields should be modified (OR logic)
      const shopNameModified =
        snapshot.shop_name_before !== null || snapshot.shop_name_after !== null;
      const shopDescriptionModified =
        snapshot.shop_description_before !== null ||
        snapshot.shop_description_after !== null;
      TestValidator.predicate(
        "at least one specified field was modified (OR logic)",
        shopNameModified || shopDescriptionModified,
      );
      // Verify snapshot ID is valid UUID
      TestValidator.predicate(
        "snapshot has valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.id,
        ),
      );
    },
  );
  // 4. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const dateRangeFilterResult =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeFilterResult);
  // Verify that all returned snapshots (if any) are within the date range
  await ArrayUtil.asyncForEach(dateRangeFilterResult.data, async (snapshot) => {
    typia.assert(snapshot);
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot created after or at from date",
      snapshotDate >= oneHourAgo,
    );
    TestValidator.predicate(
      "snapshot created before or at to date",
      snapshotDate <= now,
    );
  });
  // 5. Test combined filters (changed_fields + date range)
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          changed_fields: [
            "shop_name",
            "shop_description",
            "logo_image",
          ] as const,
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    combinedFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    combinedFilterResult.pagination.limit >= 1 &&
      combinedFilterResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    combinedFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    combinedFilterResult.pagination.pages >= 0,
  );
  // 6. Verify snapshot structure and data integrity (if snapshots exist)
  if (combinedFilterResult.data.length > 0) {
    const sampleSnapshot = combinedFilterResult.data[0];
    typia.assert(sampleSnapshot);
    // Verify seller profile relation matches authenticated seller
    TestValidator.equals(
      "seller profile belongs to authenticated seller",
      sampleSnapshot.sellerProfile.id,
      sellerAuth.id,
    );
    // Verify that at least one field was modified (since we filtered by all fields)
    const anyFieldModified =
      sampleSnapshot.shop_name_before !== null ||
      sampleSnapshot.shop_name_after !== null ||
      sampleSnapshot.shop_description_before !== null ||
      sampleSnapshot.shop_description_after !== null ||
      sampleSnapshot.logo_image_before !== null ||
      sampleSnapshot.logo_image_after !== null;
    TestValidator.predicate(
      "at least one profile field was modified",
      anyFieldModified,
    );
  }
  // 7. Test empty filter (should return all snapshots)
  const allSnapshotsResult =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsResult);
  // Verify that filtering reduces or maintains the result set size
  TestValidator.predicate(
    "filtered results are subset of all results",
    shopNameFilterResult.pagination.records <=
      allSnapshotsResult.pagination.records,
  );
  TestValidator.predicate(
    "multi-field filtered results are subset of all results",
    multiFieldFilterResult.pagination.records <=
      allSnapshotsResult.pagination.records,
  );
}
