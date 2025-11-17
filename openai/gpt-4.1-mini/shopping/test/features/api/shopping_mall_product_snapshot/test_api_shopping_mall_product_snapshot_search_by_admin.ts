import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";

/**
 * Test searching and paginating shopping mall product snapshots by an admin.
 *
 * The scenario ensures that only authenticated admins can retrieve historical
 * product snapshots. The workflow includes creating a new admin user via the
 * join operation, then performing a snapshot search with pagination and
 * filtering parameters. Validations include confirming the accuracy of
 * filtering and pagination, and authorization enforcement.
 */
export async function test_api_shopping_mall_product_snapshot_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user signup
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        ip: null,
        href: "https://admin.shoppingmall.test/join",
        referrer: "https://shoppingmall.test/login",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Perform product snapshot search with pagination and filtering
  // Prepare realistic filtering parameters
  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;
  // Use ISO date-time for snapshot filtering (last 3 months)
  const now = new Date();
  const threeMonthsAgoISO = new Date(
    now.getTime() - 90 * 24 * 3600 * 1000,
  ).toISOString();
  const nowISO = now.toISOString();

  const snapshotSearchBody: IShoppingMallProductSnapshot.IRequest = {
    page,
    limit,
    sort_by: "snapshot_at",
    filter_snapshot_at_gte: threeMonthsAgoISO,
    filter_snapshot_at_lte: nowISO,
  };

  const snapshotPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallProducts.snapshots.index(
      connection,
      { body: snapshotSearchBody },
    );
  typia.assert(snapshotPage);

  // Step 3: Validate returned pagination data
  const pagination: IPage.IPagination = snapshotPage.pagination;
  TestValidator.predicate(
    "current page should be the one requested",
    pagination.current === page,
  );
  TestValidator.predicate(
    "limit per page should be the one requested",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "total pages should be positive",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    pagination.records >= 0,
  );

  // Step 4: Validate each snapshot in the returned data
  for (const snapshot of snapshotPage.data) {
    typia.assert(snapshot);
    // snapshot_at should be in the date range
    const snapshotDate = new Date(snapshot.snapshot_at).getTime();
    const filterGte = new Date(
      snapshotSearchBody.filter_snapshot_at_gte!,
    ).getTime();
    const filterLte = new Date(
      snapshotSearchBody.filter_snapshot_at_lte!,
    ).getTime();
    TestValidator.predicate(
      "snapshot_at is not earlier than filter_snapshot_at_gte",
      snapshotDate >= filterGte,
    );
    TestValidator.predicate(
      "snapshot_at is not later than filter_snapshot_at_lte",
      snapshotDate <= filterLte,
    );
    // id and shopping_mall_product_id should match uuid format
    TestValidator.predicate(
      "snapshot id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "shopping mall product id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        snapshot.shopping_mall_product_id,
      ),
    );
    // snapshot.title and snapshot.code should be non-empty strings
    TestValidator.predicate(
      "snapshot title non-empty",
      typeof snapshot.title === "string" && snapshot.title.length > 0,
    );
    TestValidator.predicate(
      "snapshot code non-empty",
      typeof snapshot.code === "string" && snapshot.code.length > 0,
    );
  }
}
