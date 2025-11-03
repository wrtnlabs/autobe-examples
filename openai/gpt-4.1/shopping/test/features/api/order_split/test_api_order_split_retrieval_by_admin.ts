import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test that an admin can retrieve detailed information for any order split
 * using the correct order code and split code.
 *
 * Scenario Steps:
 *
 * 1. Register a new admin with a valid, random email, password, name, role, and
 *    status.
 * 2. Authenticate as that admin (implicit upon join).
 * 3. Generate (simulate) random valid orderCode and splitCode to test access
 *    rights generically, since split creation is not covered by test scope.
 * 4. As the authenticated admin, fetch detailed information for the order split
 *    using those codes.
 * 5. Validate that the split payload contains all expected fields:
 *
 *    - Id (uuid)
 *    - Split_code (string, matches requested splitCode)
 *    - Order_id (uuid)
 *    - Seller: summary object of type IShoppingSeller.ISummary
 *    - Subtotal_price (number)
 *    - Status (string)
 *    - Audit trail array order_status_histories (if present, array of ISummary)
 *    - Created_at (date-time string)
 *    - Updated_at (date-time, may be undefined)
 * 6. Assert that all expected values conform to type and business rules. Confirm
 *    split_code field matches request as basic correctness anchor.
 */
export async function test_api_order_split_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "operator", "support"] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches join",
    admin.email,
    adminJoinBody.email,
  );
  TestValidator.equals(
    "admin role matches join",
    admin.role,
    adminJoinBody.role,
  );

  // 2. Admin is now authenticated (connection headers updated by SDK)

  // 3. Simulate random valid orderCode and splitCode
  const orderCode = RandomGenerator.alphaNumeric(12);
  const splitCode = RandomGenerator.alphaNumeric(8);

  // 4. Fetch split order detail as admin
  const split: IShoppingOrderSplit =
    await api.functional.shopping.admin.orders.splits.at(connection, {
      orderCode,
      splitCode,
    });
  typia.assert(split);

  // 5. Validate split fields
  TestValidator.equals(
    "split_code matches request",
    split.split_code,
    splitCode,
  );
  TestValidator.predicate(
    "split id is uuid",
    typeof split.id === "string" && split.id.length >= 36,
  );
  TestValidator.equals(
    "seller summary has id and display_name",
    typeof split.seller.id,
    "string",
  );
  TestValidator.equals(
    "split status is non-empty string",
    typeof split.status,
    "string",
  );
  TestValidator.equals(
    "subtotal_price is number",
    typeof split.subtotal_price,
    "number",
  );
  TestValidator.equals(
    "order_id is uuid string",
    typeof split.order_id,
    "string",
  );
  TestValidator.predicate(
    "split has created_at",
    typeof split.created_at === "string" && split.created_at.length > 0,
  );
  if (split.updated_at !== undefined) {
    TestValidator.predicate(
      "updated_at is date-time string",
      typeof split.updated_at === "string" && split.updated_at.length > 0,
    );
  }
  if (split.order_status_histories !== undefined) {
    for (const entry of split.order_status_histories) {
      typia.assert(entry);
      TestValidator.equals(
        "order status history has id",
        typeof entry.id,
        "string",
      );
      TestValidator.equals(
        "triggered_by is string",
        typeof entry.triggered_by,
        "string",
      );
      TestValidator.equals(
        "occurred_at is date-time string",
        typeof entry.occurred_at,
        "string",
      );
    }
  }
}
