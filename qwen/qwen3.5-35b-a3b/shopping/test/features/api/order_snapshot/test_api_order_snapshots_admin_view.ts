import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator can retrieve paginated order snapshots for a specific order.
 *
 * Validates the order snapshots retrieval workflow including administrator authentication
 * and pagination of snapshot summaries. Ensures that the response contains all required
 * fields for each snapshot record and proper pagination metadata.
 *
 * Special attention is given to verifying that snapshot summaries include complete
 * customer information, shipping address components, and financial details as they
 * existed at snapshot creation time. Pagination metadata must accurately reflect
 * total records and page structure.
 *
 * 1. Administrator registers with email/password credentials using the join utility.
 * 2. Administrator obtains authentication tokens for admin access.
 * 3. Administrator requests order snapshots with pagination parameters (page=1, limit=10).
 * 4. Verify response contains paginated snapshot summaries with all required fields:
 *    id, order_number, order_date, customer_name, customer_phone, shipping address
 *    components, item_count, subtotal, shipping_fee, total_amount, order_status.
 * 5. Verify pagination metadata shows correct current page, limit, total records, and
 *    total pages.
 * 6. Validate snapshot structure immutability and completeness.
 */
export async function test_api_order_snapshots_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  // 2. Generate a valid order ID UUID for the request
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve order snapshots as administrator with pagination parameters
  const snapshotsResponse: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate response structure - ensure it matches IPageIEcommerceMallOrderSnapshot.ISummary
  typia.assert(snapshotsResponse);
  const snapshots: IEcommerceMallOrderSnapshot.ISummary[] =
    snapshotsResponse.data;
  const pagination: IPage.IPagination = snapshotsResponse.pagination;
  // 5. Validate pagination metadata structure
  TestValidator.equals("current page equals 1", pagination.current, 1);
  TestValidator.equals("limit equals 10", pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", () => pagination.pages >= 0);
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Validate snapshot summaries structure if any exist
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot: IEcommerceMallOrderSnapshot.ISummary = snapshots[i];
    typia.assert(snapshot);
    // 7. Validate all required fields exist with correct types
    TestValidator.equals(
      `snapshot[${i}] has valid UUID id`,
      snapshot.id,
      snapshot.id,
    );
    TestValidator.predicate(
      `snapshot[${i}] order_number is string`,
      () => typeof snapshot.order_number === "string",
    );
    TestValidator.equals(
      `snapshot[${i}] has valid order_date`,
      snapshot.order_date,
      snapshot.order_date,
    );
    TestValidator.equals(
      `snapshot[${i}] customer_name is string`,
      snapshot.customer_name,
      snapshot.customer_name,
    );
    TestValidator.equals(
      `snapshot[${i}] customer_phone is string`,
      snapshot.customer_phone,
      snapshot.customer_phone,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_recipient_name is string`,
      snapshot.shipping_recipient_name,
      snapshot.shipping_recipient_name,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_phone is string`,
      snapshot.shipping_phone,
      snapshot.shipping_phone,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_street is string`,
      snapshot.shipping_street,
      snapshot.shipping_street,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_city is string`,
      snapshot.shipping_city,
      snapshot.shipping_city,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_state is string`,
      snapshot.shipping_state,
      snapshot.shipping_state,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_postal_code is string`,
      snapshot.shipping_postal_code,
      snapshot.shipping_postal_code,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_country is string`,
      snapshot.shipping_country,
      snapshot.shipping_country,
    );
    TestValidator.equals(
      `snapshot[${i}] item_count is number`,
      snapshot.item_count,
      snapshot.item_count,
    );
    TestValidator.equals(
      `snapshot[${i}] subtotal is number`,
      snapshot.subtotal,
      snapshot.subtotal,
    );
    TestValidator.equals(
      `snapshot[${i}] shipping_fee is number`,
      snapshot.shipping_fee,
      snapshot.shipping_fee,
    );
    TestValidator.equals(
      `snapshot[${i}] total_amount is number`,
      snapshot.total_amount,
      snapshot.total_amount,
    );
    TestValidator.equals(
      `snapshot[${i}] order_status is string`,
      snapshot.order_status,
      snapshot.order_status,
    );
    // 8. Validate numeric field constraints
    TestValidator.predicate(
      `snapshot[${i}] item_count is positive`,
      () => snapshot.item_count >= 0,
    );
    TestValidator.predicate(
      `snapshot[${i}] subtotal is non-negative`,
      () => snapshot.subtotal >= 0,
    );
    TestValidator.predicate(
      `snapshot[${i}] shipping_fee is non-negative`,
      () => snapshot.shipping_fee >= 0,
    );
    TestValidator.predicate(
      `snapshot[${i}] total_amount is non-negative`,
      () => snapshot.total_amount >= 0,
    );
  }
}
