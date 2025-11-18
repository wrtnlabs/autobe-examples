import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminNotification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_admin_notification_search_text_and_type_filters(
  connection: api.IConnection,
) {
  // 1. Join as an admin and get authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Seed notifications with distinct titles, bodies, and types
  // We'll create:
  // - 2 payout_alert notifications containing keyword "PAYOUT FAILURE" in title
  // - 1 payout_alert notification without keyword
  // - 2 risk_sla_violation notifications containing "RISK CASE" in title
  // - 1 risk_sla_violation notification without keyword

  const baseStatus = "unread";

  const payoutWithKeyword1 =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "payout_alert",
          title: "PAYOUT FAILURE on seller settlement #1",
          body: "PAYOUT FAILURE for seller settlement due to bank rejection",
          status: baseStatus,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(payoutWithKeyword1);

  const payoutWithKeyword2 =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "payout_alert",
          title: "PAYOUT FAILURE on seller settlement #2",
          body: "Second PAYOUT FAILURE for another seller",
          status: baseStatus,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(payoutWithKeyword2);

  const payoutWithoutKeyword =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "payout_alert",
          title: "Scheduled payout succeeded",
          body: "Regular payout success notification with no failure keyword",
          status: baseStatus,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(payoutWithoutKeyword);

  const riskWithKeyword1 =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "risk_sla_violation",
          title: "RISK CASE SLA violation detected #1",
          body: "RISK CASE escalated due to SLA breach",
          status: baseStatus,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(riskWithKeyword1);

  const riskWithKeyword2 =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "risk_sla_violation",
          title: "RISK CASE SLA violation detected #2",
          body: "Another RISK CASE with SLA issues",
          status: baseStatus,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(riskWithKeyword2);

  const riskWithoutKeyword =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminId,
          type: "risk_sla_violation",
          title: "Risk monitoring passive alert",
          body: "Background risk monitoring with no SLA violation",
          status: baseStatus,
        } satisfies IShoppingMallAdminNotification.ICreate,
      },
    );
  typia.assert<IShoppingMallAdminNotification>(riskWithoutKeyword);

  // 3. Search for keyword "PAYOUT" with types filter ["payout_alert"]
  const payoutSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminId,
    types: ["payout_alert"],
    search: "PAYOUT",
  } satisfies IShoppingMallAdminNotification.IRequest;

  const payoutSearchPage =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      connection,
      {
        body: payoutSearchRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(payoutSearchPage);

  // 4. Validate that all returned notifications match the type and keyword expectations
  const payoutResults = payoutSearchPage.data;

  // There should be at least the two payout_with_keyword notifications
  TestValidator.predicate(
    "payout search should return at least two notifications with PAYOUT keyword",
    payoutResults.length >= 2,
  );

  // All results must be payout_alert type and belong to our admin
  for (const item of payoutResults) {
    TestValidator.equals(
      "all payout search results must have type payout_alert",
      item.type,
      "payout_alert",
    );
    TestValidator.equals(
      "all payout search results must belong to the created admin",
      item.admin.id,
      adminId,
    );

    // Basic keyword assertion: title should contain "PAYOUT" (case sensitive here)
    TestValidator.predicate(
      "payout search results title should contain keyword PAYOUT",
      item.title.includes("PAYOUT"),
    );
  }

  // Also ensure that the known payout_without_keyword notification is not present
  const payoutIds = payoutResults.map((r) => r.id);
  TestValidator.predicate(
    "payout notification without keyword should not appear in PAYOUT search results",
    payoutIds.includes(payoutWithoutKeyword.id) === false,
  );

  // And ensure that risk_sla_violation notifications are not present
  const riskIds = [
    riskWithKeyword1.id,
    riskWithKeyword2.id,
    riskWithoutKeyword.id,
  ];
  TestValidator.predicate(
    "risk_sla_violation notifications must not be included in payout_alert type-filtered search",
    payoutResults.every((item) => riskIds.includes(item.id) === false),
  );

  // 5. Optional: perform a second search for RISK keyword + risk_sla_violation type
  const riskSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminId,
    types: ["risk_sla_violation"],
    search: "RISK",
  } satisfies IShoppingMallAdminNotification.IRequest;

  const riskSearchPage =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      connection,
      {
        body: riskSearchRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(riskSearchPage);

  const riskResults = riskSearchPage.data;

  TestValidator.predicate(
    "risk search should return at least two notifications with RISK keyword",
    riskResults.length >= 2,
  );

  for (const item of riskResults) {
    TestValidator.equals(
      "all risk search results must have type risk_sla_violation",
      item.type,
      "risk_sla_violation",
    );
    TestValidator.equals(
      "all risk search results must belong to the created admin",
      item.admin.id,
      adminId,
    );
    TestValidator.predicate(
      "risk search results title should contain keyword RISK",
      item.title.includes("RISK"),
    );
  }

  const riskResultIds = riskResults.map((r) => r.id);
  TestValidator.predicate(
    "payout_alert notifications must not be included in risk_sla_violation type-filtered search",
    riskResultIds.includes(payoutWithKeyword1.id) === false &&
      riskResultIds.includes(payoutWithKeyword2.id) === false &&
      riskResultIds.includes(payoutWithoutKeyword.id) === false,
  );
}
