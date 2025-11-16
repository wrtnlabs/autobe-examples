import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentStatus";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatus";

/**
 * Test that an authenticated admin can search and retrieve the status
 * transition history for a specific payment using various filters, and that
 * access control and edge cases are correctly enforced.
 *
 * 1. Register a new admin and use the issued token for subsequent calls.
 * 2. Attempt to retrieve status history for a random payment ID.
 * 3. Attempt requests with unauthenticated connection to ensure 401/403 denial.
 * 4. Search with combinations of filters such as pagination, sorting, search
 *    string, status value, and changed_by_admin_id.
 * 5. Attempt queries against a non-existent payment ID and an ID with no status
 *    history.
 * 6. Validate correct structure for data and pagination, and filter logic.
 */
export async function test_api_payment_status_history_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!A1";
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: adminName as string & tags.MinLength<1>,
    },
  });
  typia.assert(admin);

  // 2. Search status history for a payment with random UUID
  const randomPaymentId = typia.random<string & tags.Format<"uuid">>();
  const randomFilter: IShoppingMallPaymentStatus.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort: "changed_at",
    order: RandomGenerator.pick(["asc", "desc"] as const),
    search: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.pick([
      "completed",
      "failed",
      "pending",
      "refunded",
    ] as const),
    changed_by_admin_id: admin.id as string & tags.Format<"uuid">,
  };

  const output =
    await api.functional.shoppingMall.admin.payments.statuses.index(
      connection,
      {
        paymentId: randomPaymentId,
        body: randomFilter,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination type valid",
    typeof output.pagination.current,
    "number",
  );
  TestValidator.equals("data type valid", Array.isArray(output.data), true);
  if (output.data.length > 0) {
    for (const item of output.data) {
      typia.assert(item);
      TestValidator.equals(
        "matching payment_id",
        item.payment_id,
        randomPaymentId,
      );
      if (randomFilter.status !== undefined) {
        TestValidator.equals(
          "status value matches filter",
          item.new_status,
          randomFilter.status,
        );
      }
      if (
        randomFilter.changed_by_admin_id !== undefined &&
        randomFilter.changed_by_admin_id !== null
      ) {
        TestValidator.equals(
          "admin ID matches",
          item.changed_by_admin_id,
          admin.id,
        );
      }
    }
  }

  // 3. Edge case: non-existent payment ID
  const fakePaymentId = typia.random<string & tags.Format<"uuid">>();
  const fakeFilter: IShoppingMallPaymentStatus.IRequest = { page: 1, limit: 5 };
  await TestValidator.error(
    "non-existent payment ID returns empty or error",
    async () => {
      await api.functional.shoppingMall.admin.payments.statuses.index(
        connection,
        {
          paymentId: fakePaymentId,
          body: fakeFilter,
        },
      );
    },
  );

  // 4. Edge case: payment with no status history (simulate ID)
  const noHistoryPaymentId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.shoppingMall.admin.payments.statuses.index(
      connection,
      {
        paymentId: noHistoryPaymentId,
        body: { page: 1, limit: 3 },
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "empty data for payment with no history",
    result.data.length,
    0,
  );

  // 5. Unauthorized: Search without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request must be denied",
    async () => {
      await api.functional.shoppingMall.admin.payments.statuses.index(
        unauthConn,
        {
          paymentId: randomPaymentId,
          body: { page: 1, limit: 2 },
        },
      );
    },
  );
}
