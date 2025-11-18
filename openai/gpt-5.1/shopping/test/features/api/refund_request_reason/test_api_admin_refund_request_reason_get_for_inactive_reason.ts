import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Ensure admins can retrieve inactive refund request reasons by code.
 *
 * Business context
 *
 * - Governance/operations teams manage a catalog of refund request reasons used
 *   across refund and cancellation flows.
 * - Reasons can be deactivated (is_active=false) but must remain readable so that
 *   audit tools and back-office UIs can inspect historical configurations.
 *
 * Scenario steps
 *
 * 1. Register a new admin using POST /auth/admin/join, which also establishes an
 *    authenticated admin context via JWT in the connection headers.
 * 2. As that admin, create a refund request reason with is_active=false using POST
 *    /shoppingMall/admin/refundRequestReasons.
 * 3. Retrieve the reason by its business code using GET
 *    /shoppingMall/admin/refundRequestReasons/{reasonCode}.
 * 4. Assert that the fetched configuration matches the created one, including
 *    is_active=false, and that read operations do not mutate the record.
 */
export async function test_api_admin_refund_request_reason_get_for_inactive_reason(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an INACTIVE refund request reason configuration
  const reasonCodePrefix = "inactive_reason_";
  const reasonCodeRandom = RandomGenerator.alphaNumeric(12);
  const reasonCode = `${reasonCodePrefix}${reasonCodeRandom}`;

  const createBody = {
    code: reasonCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    applies_to_cancellation: RandomGenerator.pick([true, false] as const),
    applies_to_refund: RandomGenerator.pick([true, false] as const),
    is_active: false,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const created: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRefundRequestReason>(created);

  // 3. Retrieve the reason by its business code, even though it is inactive
  const fetched: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.at(
      connection,
      {
        reasonCode: created.code,
      },
    );
  typia.assert<IShoppingMallRefundRequestReason>(fetched);

  // 4. Business validations: fetched configuration must match created one
  TestValidator.equals(
    "refund reason code should match between create and get",
    fetched.code,
    created.code,
  );

  TestValidator.equals(
    "refund reason name should match between create and get",
    fetched.name,
    created.name,
  );

  TestValidator.equals(
    "refund reason description should match between create and get",
    fetched.description ?? null,
    created.description ?? null,
  );

  TestValidator.equals(
    "applies_to_cancellation flag should be preserved on fetch",
    fetched.applies_to_cancellation,
    created.applies_to_cancellation,
  );

  TestValidator.equals(
    "applies_to_refund flag should be preserved on fetch",
    fetched.applies_to_refund,
    created.applies_to_refund,
  );

  TestValidator.equals(
    "inactive refund reason should remain inactive when fetched",
    fetched.is_active,
    false,
  );

  TestValidator.equals(
    "is_active flag should be consistent between created and fetched records",
    fetched.is_active,
    created.is_active,
  );

  // created_at and updated_at should not be mutated by a read operation
  TestValidator.equals(
    "created_at timestamp should match between created and fetched reason",
    fetched.created_at,
    created.created_at,
  );

  TestValidator.equals(
    "updated_at timestamp should match between created and fetched reason",
    fetched.updated_at,
    created.updated_at,
  );

  // Additional predicate to emphasize business behavior: inactive reasons are retrievable
  TestValidator.predicate(
    "inactive refund reason is retrievable and marked inactive",
    fetched.is_active === false,
  );
}
