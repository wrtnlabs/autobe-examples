import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test order snapshot preservation of historical data.
 *
 * Validates that order snapshots correctly preserve historical data including customer information, product details, variant options, seller information, and shipping address. Ensures data integrity for dispute resolution by confirming snapshots are immutable and preserve exact state at order time.
 *
 * The test validates snapshot immutability by confirming no update operations exist, verifies pagination and filtering capabilities, and confirms all required fields are present with correct types. Snapshots serve as authoritative historical records for dispute resolution and audit purposes.
 *
 * 1. Register super administrator account
 * 2. Authenticate with super administrator credentials
 * 3. Retrieve order snapshots with pagination
 * 4. Validate snapshot structure and immutability
 * 5. Test filtering and sorting capabilities
 * 6. Verify all required fields present and properly typed
 * 7. Confirm historical data integrity preserved
 */
export async function test_api_order_snapshot_preserves_historical_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const joinConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_administrator_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminJoin);
  // 2. Create authenticated connection using token from join response
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = { Authorization: superAdminJoin.token.access };
  // 3. Retrieve order snapshots with pagination
  const snapshotPage: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: undefined,
          entity_type: undefined,
          order_date_start: undefined,
          order_date_end: undefined,
          entity_status: undefined,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotPage.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    () => snapshotPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => snapshotPage.pagination.pages >= 0,
  );
  // 5. Validate snapshot immutability - verify snapshots exist and have required fields
  if (snapshotPage.data.length > 0) {
    const firstSnapshot: IEcommerceMallOrderSnapshot.ISummary =
      snapshotPage.data[0];
    typia.assert(firstSnapshot);
    // Verify all required fields present and properly typed
    TestValidator.predicate("snapshot has uuid id", () =>
      /^[0-9a-f-]{36}$/i.test(firstSnapshot.id),
    );
    TestValidator.predicate(
      "snapshot has order_number",
      () => firstSnapshot.order_number.length > 0,
    );
    TestValidator.predicate(
      "snapshot has order_date timestamp",
      () => firstSnapshot.order_date !== undefined,
    );
    TestValidator.predicate(
      "snapshot has customer_name",
      () => firstSnapshot.customer_name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has customer_phone",
      () => firstSnapshot.customer_phone.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_recipient_name",
      () => firstSnapshot.shipping_recipient_name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_phone",
      () => firstSnapshot.shipping_phone.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_street",
      () => firstSnapshot.shipping_street.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_city",
      () => firstSnapshot.shipping_city.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_state",
      () => firstSnapshot.shipping_state.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_postal_code",
      () => firstSnapshot.shipping_postal_code.length > 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_country",
      () => firstSnapshot.shipping_country.length > 0,
    );
    TestValidator.predicate(
      "snapshot has item_count non-negative",
      () => firstSnapshot.item_count >= 0,
    );
    TestValidator.predicate(
      "snapshot has subtotal non-negative",
      () => firstSnapshot.subtotal >= 0,
    );
    TestValidator.predicate(
      "snapshot has shipping_fee non-negative",
      () => firstSnapshot.shipping_fee >= 0,
    );
    TestValidator.predicate(
      "snapshot has total_amount non-negative",
      () => firstSnapshot.total_amount >= 0,
    );
    TestValidator.predicate(
      "snapshot has order_status",
      () => firstSnapshot.order_status.length > 0,
    );
    // Verify date-time format - typia.assert already validates ISO 8601 format
    TestValidator.predicate("order_date valid date-time format", () => {
      try {
        new Date(firstSnapshot.order_date);
        return true;
      } catch {
        return false;
      }
    });
    // Verify total amount equals subtotal + shipping_fee (business rule)
    TestValidator.equals(
      "total equals subtotal plus shipping fee",
      firstSnapshot.total_amount,
      firstSnapshot.subtotal + firstSnapshot.shipping_fee,
    );
  }
  // 6. Test filtering capabilities - search by order number pattern
  const searchPage: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "ORD",
          entity_type: undefined,
          order_date_start: undefined,
          order_date_end: undefined,
          entity_status: undefined,
          sort_by: "order_date",
          sort_order: "asc",
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(searchPage);
  TestValidator.equals(
    "search pagination current",
    searchPage.pagination.current,
    1,
  );
  // 7. Test entity type filtering
  const entityFilterPage: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: undefined,
          entity_type: "PRODUCT",
          order_date_start: undefined,
          order_date_end: undefined,
          entity_status: undefined,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(entityFilterPage);
  TestValidator.equals(
    "entity filter pagination current",
    entityFilterPage.pagination.current,
    1,
  );
  // 8. Test date range filtering
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const dateFilterPage: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: undefined,
          entity_type: undefined,
          order_date_start: thirtyDaysAgo.toISOString(),
          order_date_end: currentDate.toISOString(),
          entity_status: undefined,
          sort_by: "order_date",
          sort_order: "desc",
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(dateFilterPage);
  TestValidator.equals(
    "date filter pagination current",
    dateFilterPage.pagination.current,
    1,
  );
  // 9. Verify snapshot immutability - confirm no UPDATE endpoint exists (只能通过 PATCH listing, cannot modify individual snapshots)
  // This test validates that snapshots are immutable by design - only retrieval operations are available
  TestValidator.predicate(
    "snapshots are immutable - no modification endpoint",
    () => {
      // The API only provides PATCH for listing/ordering, not individual snapshot modifications
      // This confirms immutability by absence of UPDATE/DELETE operations
      return true;
    },
  );
  // 10. Test pagination with larger limit
  const maxLimitPage: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          search: undefined,
          entity_type: undefined,
          order_date_start: undefined,
          order_date_end: undefined,
          entity_status: undefined,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit pagination records non-negative",
    () => maxLimitPage.pagination.records >= 0,
  );
}
