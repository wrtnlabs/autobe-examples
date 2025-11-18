import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHoldTarget";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

/**
 * Validate that admin listing of legal hold targets can be filtered by
 * target_type.
 *
 * Business context: Governance/admin users manage legal holds and attach
 * individual business entities (customers, orders, etc.) as legal hold targets.
 * They need to list those targets for a particular legal hold and filter by
 * target_type so they can, for example, see only customer-related targets.
 *
 * Scenario steps:
 *
 * 1. Admin joins the platform through POST /auth/admin/join which returns an
 *    authorized admin + sets Authorization header on the connection.
 * 2. Using that admin context, create a legal hold via POST
 *    /shoppingMall/admin/legalHolds and capture its `code`.
 * 3. Under that legal hold, create two targets via POST
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets:
 *
 *    - One target with target_type "customer" and a fresh UUID target_id.
 *    - One target with target_type "order" and a different fresh UUID target_id.
 * 4. Invoke PATCH /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with an
 *    IShoppingMallLegalHoldTarget.IRequest body where:
 *
 *    - Page = 1
 *    - Limit = a reasonable small value like 20
 *    - Target_type = "customer"
 *    - Target_id, created_from, created_to, order_by, order_direction are
 *         unconstrained and set to null.
 * 5. Assert the response type using typia.assert and inspect pagination and data:
 *
 *    - Pagination.records should be >= 1
 *    - Every entry in data should have target_type === "customer".
 *    - Ensure that none of the returned entries has target_type === "order".
 * 6. Additionally, confirm that at least one returned entry has target_id equal to
 *    the specific customer target_id created in step 3 so that we know the
 *    filter actually includes our created record.
 */
export async function test_api_admin_legal_hold_targets_index_with_type_filter(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a legal hold
  const legalHoldCreateBody = typia.random<IShoppingMallLegalHold.ICreate>();
  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(legalHold);

  const legalHoldCode: string = legalHold.code;

  // 3. Create two targets with different target_type values
  const customerTargetId = typia.random<string & tags.Format<"uuid">>();
  const orderTargetId = typia.random<string & tags.Format<"uuid">>();

  const customerTargetCreateBody = {
    target_type: "customer",
    target_id: customerTargetId,
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const orderTargetCreateBody = {
    target_type: "order",
    target_id: orderTargetId,
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const customerTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: customerTargetCreateBody,
      },
    );
  typia.assert(customerTarget);

  const orderTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: orderTargetCreateBody,
      },
    );
  typia.assert(orderTarget);

  // 4. List targets with filter target_type = "customer"
  const requestBody = {
    page: 1,
    limit: 20,
    target_type: "customer",
    target_id: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const pageResult: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 5. Assertions on pagination and data
  TestValidator.predicate(
    "pagination.records should be >= 1",
    pageResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data length should be >= 1",
    pageResult.data.length >= 1,
  );

  // ensure all entries are customer targets and none are order targets
  for (const item of pageResult.data) {
    TestValidator.equals(
      "every returned target_type must be 'customer'",
      item.target_type,
      "customer",
    );
    TestValidator.notEquals(
      "no returned target_type should be 'order'",
      item.target_type,
      "order",
    );
  }

  // 6. Ensure at least one result corresponds to our created customer target
  const hasCustomerTarget = pageResult.data.some(
    (item) => item.target_id === customerTargetId,
  );
  TestValidator.predicate(
    "result set should contain the created customer target",
    hasCustomerTarget,
  );
}
