import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";

/**
 * Validate admin search of refund request reasons by text and applicability
 * flags.
 *
 * Business workflow:
 *
 * 1. Admin joins via POST /auth/admin/join and becomes authenticated.
 * 2. Admin seeds multiple refund request reasons with various codes/names and
 *    flags.
 * 3. Admin searches with PATCH /shoppingMall/admin/refundRequestReasons using:
 *
 *    - Search substring "DAMAGED"
 *    - Applies_to_refund=true
 *    - Applies_to_cancellation=null
 *    - Page=1, limit large enough
 * 4. Validate that only reasons whose code or name contains "DAMAGED" and
 *    applies_to_refund === true are returned, including inactive ones when
 *    is_active is null.
 * 5. Run another query with applies_to_cancellation=true and
 *    applies_to_refund=null to ensure cancellation-only filtering works.
 */
export async function test_api_admin_refund_request_reason_search_by_text_and_flags(
  connection: api.IConnection,
) {
  // 1. Admin joins and gets authenticated
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed refund request reasons with different codes/names/flags
  const damagedRefundOnlyBody = {
    code: "DAMAGED_ITEM",
    name: "Damaged item on arrival",
    description: "Item arrived damaged and unusable.",
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;
  const damagedRefundOnly =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: damagedRefundOnlyBody },
    );
  typia.assert<IShoppingMallRefundRequestReason>(damagedRefundOnly);

  const damagedBothBody = {
    code: "DAMAGED_PACKAGING",
    name: "Damaged packaging only",
    description: "Only the packaging is damaged.",
    applies_to_cancellation: true,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;
  const damagedBoth =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: damagedBothBody },
    );
  typia.assert<IShoppingMallRefundRequestReason>(damagedBoth);

  const otherRefundBody = {
    code: "OTHER_ISSUE",
    name: "Other issue",
    description: "Some other issue not listed.",
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;
  const otherRefund =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: otherRefundBody },
    );
  typia.assert<IShoppingMallRefundRequestReason>(otherRefund);

  const cancellationOnlyBody = {
    code: "CUSTOMER_CHANGED_MIND",
    name: "Customer changed mind",
    description: "Customer no longer wants the order.",
    applies_to_cancellation: true,
    applies_to_refund: false,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;
  const cancellationOnly =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: cancellationOnlyBody },
    );
  typia.assert<IShoppingMallRefundRequestReason>(cancellationOnly);

  const inactiveDamagedBody = {
    code: "DAMAGED_INACTIVE",
    name: "Inactive damaged reason",
    description: "Deprecated damaged reason.",
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: false,
  } satisfies IShoppingMallRefundRequestReason.ICreate;
  const inactiveDamaged =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: inactiveDamagedBody },
    );
  typia.assert<IShoppingMallRefundRequestReason>(inactiveDamaged);

  // 3. Search by text "DAMAGED" and applies_to_refund=true
  const firstSearchBody = {
    page: 1,
    limit: 20,
    search: "DAMAGED",
    is_active: null,
    applies_to_refund: true,
    applies_to_cancellation: null,
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const firstPage =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: firstSearchBody },
    );
  typia.assert<IPageIShoppingMallRefundRequestReason.ISummary>(firstPage);

  const firstData = firstPage.data;

  // Ensure all results match the filter conditions
  TestValidator.predicate(
    "all first query results match 'DAMAGED' search and applies_to_refund true",
    () =>
      firstData.every((reason) => {
        const matchesText =
          reason.code.includes("DAMAGED") || reason.name.includes("Damaged");
        return matchesText && reason.applies_to_refund === true;
      }),
  );

  // Ensure expected reasons are present
  TestValidator.predicate("first query includes damagedRefundOnly", () =>
    firstData.some((r) => r.id === damagedRefundOnly.id),
  );
  TestValidator.predicate("first query includes damagedBoth", () =>
    firstData.some((r) => r.id === damagedBoth.id),
  );
  TestValidator.predicate(
    "first query includes inactiveDamaged despite is_active null",
    () => firstData.some((r) => r.id === inactiveDamaged.id),
  );

  // Ensure non-matching reasons are excluded
  TestValidator.predicate(
    "first query excludes otherRefund (no 'DAMAGED' in code/name)",
    () => !firstData.some((r) => r.id === otherRefund.id),
  );
  TestValidator.predicate(
    "first query excludes cancellationOnly (applies_to_refund=false)",
    () => !firstData.some((r) => r.id === cancellationOnly.id),
  );

  // 4. Second query: filter by applies_to_cancellation=true only
  const secondSearchBody = {
    page: 1,
    limit: 20,
    applies_to_refund: null,
    applies_to_cancellation: true,
    is_active: null,
  } satisfies IShoppingMallRefundRequestReason.IRequest;

  const secondPage =
    await api.functional.shoppingMall.admin.refundRequestReasons.index(
      connection,
      { body: secondSearchBody },
    );
  typia.assert<IPageIShoppingMallRefundRequestReason.ISummary>(secondPage);

  const secondData = secondPage.data;

  // All results must have applies_to_cancellation true
  TestValidator.predicate(
    "all second query results have applies_to_cancellation true",
    () => secondData.every((r) => r.applies_to_cancellation === true),
  );

  // Expected inclusions
  TestValidator.predicate("second query includes cancellationOnly", () =>
    secondData.some((r) => r.id === cancellationOnly.id),
  );
  TestValidator.predicate("second query includes damagedBoth", () =>
    secondData.some((r) => r.id === damagedBoth.id),
  );

  // Expected exclusions
  TestValidator.predicate(
    "second query excludes damagedRefundOnly (cancellation flag false)",
    () => !secondData.some((r) => r.id === damagedRefundOnly.id),
  );
  TestValidator.predicate(
    "second query excludes otherRefund (cancellation flag false)",
    () => !secondData.some((r) => r.id === otherRefund.id),
  );
  TestValidator.predicate(
    "second query excludes inactiveDamaged (cancellation flag false)",
    () => !secondData.some((r) => r.id === inactiveDamaged.id),
  );
}
