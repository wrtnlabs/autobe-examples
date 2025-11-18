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
 * Validate sorting of legal hold targets by created_at in both descending and
 * ascending order.
 *
 * Business context: Administrative users managing legal holds must be able to
 * inspect the list of targets attached to a given legal hold, ordered by the
 * time each target was attached. This test ensures that the index endpoint for
 * legal hold targets correctly honors the order_by and order_direction
 * parameters when sorting by created_at.
 *
 * Steps:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    admin context (Authorization header managed by SDK).
 * 2. Create a new legal hold using POST /shoppingMall/admin/legalHolds and capture
 *    its business code.
 * 3. Under that legal hold, create multiple legal hold targets sequentially via
 *    POST /shoppingMall/admin/legalHolds/{legalHoldCode}/targets.
 * 4. Call PATCH /shoppingMall/admin/legalHolds/{legalHoldCode}/targets with an
 *    IShoppingMallLegalHoldTarget.IRequest specifying:
 *
 *    - Page: 1
 *    - Limit: a value >= number of created targets (e.g., 20)
 *    - Order_by: "created_at"
 *    - Order_direction: "desc"
 *    - Other filters left null/undefined so they do not restrict results.
 * 5. Verify the response is a valid IPageIShoppingMallLegalHoldTarget.ISummary and
 *    that the data array is sorted in descending order of created_at
 *    (non-increasing when compared lexicographically as ISO 8601 strings).
 * 6. Call the same endpoint again with order_direction: "asc" and confirm that the
 *    returned data is sorted in ascending order of created_at (non-decreasing)
 *    and that, when the same items are present, the order is the reverse of the
 *    DESC result.
 */
export async function test_api_admin_legal_hold_targets_index_sorting_by_created_at_desc(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new legal hold and capture its code.
  const legalHoldBody = {
    code: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 3. Create multiple legal hold targets sequentially.
  const targetCount = 5;
  const createdTargets: IShoppingMallLegalHoldTarget[] = [];

  for (let i = 0; i < targetCount; i++) {
    const targetBody = {
      target_type: "order", // arbitrary business type string
      target_id: typia.random<string & tags.Format<"uuid">>(),
      target_display: RandomGenerator.paragraph({ sentences: 2 }),
      note: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallLegalHoldTarget.ICreate;

    const createdTarget: IShoppingMallLegalHoldTarget =
      await api.functional.shoppingMall.admin.legalHolds.targets.create(
        connection,
        {
          legalHoldCode: legalHold.code,
          body: targetBody,
        },
      );
    typia.assert(createdTarget);
    createdTargets.push(createdTarget);
  }

  TestValidator.equals(
    "number of created targets should match targetCount",
    createdTargets.length,
    targetCount,
  );

  // 4. Call index with descending order_by created_at.
  const descRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    target_type: null,
    target_id: null,
    created_from: null,
    created_to: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const descPage: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: descRequestBody,
      },
    );
  typia.assert(descPage);

  const descData = descPage.data;

  TestValidator.predicate(
    "desc page should contain at least the created targets (by count)",
    descData.length >= createdTargets.length,
  );

  if (descData.length >= 2) {
    for (let i = 1; i < descData.length; i++) {
      const prev = descData[i - 1];
      const curr = descData[i];
      TestValidator.predicate(
        `created_at should be non-increasing at index ${i} in DESC order`,
        prev.created_at >= curr.created_at,
      );
    }
  }

  // 5. Call index again with ascending order and compare.
  const ascRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    target_type: null,
    target_id: null,
    created_from: null,
    created_to: null,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const ascPage: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode: legalHold.code,
        body: ascRequestBody,
      },
    );
  typia.assert(ascPage);

  const ascData = ascPage.data;

  TestValidator.predicate(
    "asc page should contain at least the created targets (by count)",
    ascData.length >= createdTargets.length,
  );

  if (ascData.length >= 2) {
    for (let i = 1; i < ascData.length; i++) {
      const prev = ascData[i - 1];
      const curr = ascData[i];
      TestValidator.predicate(
        `created_at should be non-decreasing at index ${i} in ASC order`,
        prev.created_at <= curr.created_at,
      );
    }
  }

  // Optional: When both lists contain at least as many items as we created,
  // compare the first N items to see that ASC is reverse of DESC by created_at.
  const minComparable = Math.min(descData.length, ascData.length, targetCount);
  if (minComparable >= 2) {
    const descSlice = descData.slice(0, minComparable);
    const ascSlice = ascData.slice(0, minComparable);

    // Check that first element of DESC matches last of ASC by created_at.
    TestValidator.equals(
      "first DESC created_at should equal last ASC created_at",
      descSlice[0].created_at,
      ascSlice[minComparable - 1].created_at,
    );
  }
}
