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

export async function test_api_admin_notification_search_by_status_and_priority(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  const adminId = adminAuthorized.id;

  // 2. Seed notifications with different status/priority combinations for this admin
  // We'll create a controlled set so we can assert filtering precisely.
  type Status = "unread" | "read" | "archived";
  type Priority = "high" | "normal" | "low" | null;

  const combinations: Array<{ status: Status; priority: Priority }> = [
    { status: "unread", priority: "high" },
    { status: "unread", priority: "normal" },
    { status: "unread", priority: "low" },
    { status: "read", priority: "high" },
    { status: "read", priority: "normal" },
    { status: "read", priority: "low" },
    { status: "archived", priority: "high" },
    { status: "archived", priority: "normal" },
    { status: "archived", priority: "low" },
    { status: "unread", priority: null },
  ];

  const createdNotifications: IShoppingMallAdminNotification[] = [];

  for (const [index, combo] of combinations.entries()) {
    const body = {
      shopping_mall_admin_id: adminId,
      related_risk_case_id: null,
      related_legal_hold_id: null,
      type: `test_type_${index}`,
      title: `Notification ${index}`,
      body: RandomGenerator.paragraph({ sentences: 5 }),
      status: combo.status,
      priority: combo.priority,
      entity_type: null,
      entity_id: null,
      entity_display: null,
      read_at: null,
      archived_at: null,
    } satisfies IShoppingMallAdminNotification.ICreate;

    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallAdminNotification>(created);
    createdNotifications.push(created);
  }

  // Helper to perform a search and validate that all results match filters
  const assertFilteredSearch = async (
    title: string,
    request: IShoppingMallAdminNotification.IRequest,
    predicate: (n: IShoppingMallAdminNotification.ISummary) => boolean,
  ) => {
    const page =
      await api.functional.shoppingMall.admin.adminNotifications.index(
        connection,
        {
          body: request,
        },
      );
    typia.assert<IPageIShoppingMallAdminNotification.ISummary>(page);

    // Basic pagination sanity checks
    const pagination = page.pagination;
    typia.assert<IPage.IPagination>(pagination);

    // All summaries must satisfy predicate
    for (const summary of page.data) {
      typia.assert<IShoppingMallAdminNotification.ISummary>(summary);
      TestValidator.predicate(
        `${title} - summary must satisfy filter predicate`,
        predicate(summary),
      );
    }

    // Pagination records should be >= returned data length and >= 0
    TestValidator.predicate(
      `${title} - records should be >= data length`,
      pagination.records >= page.data.length,
    );
    TestValidator.predicate(
      `${title} - pages should be >= 1 when there are records`,
      pagination.records === 0 || pagination.pages >= 1,
    );
  };

  // 3. Filter: statuses ["unread"], priorities ["high"]
  const requestUnreadHigh: IShoppingMallAdminNotification.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminId,
    statuses: ["unread"],
    priorities: ["high"],
  };

  await assertFilteredSearch(
    "filter unread + high",
    requestUnreadHigh,
    (summary) => summary.status === "unread" && summary.priority === "high",
  );

  // 4. Filter: statuses ["read", "archived"], priorities ["low", "normal"]
  const requestReadArchivedLowNormal: IShoppingMallAdminNotification.IRequest =
    {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
      shopping_mall_admin_id: adminId,
      statuses: ["read", "archived"],
      priorities: ["low", "normal"],
    };

  await assertFilteredSearch(
    "filter read/archived + low/normal",
    requestReadArchivedLowNormal,
    (summary) =>
      (summary.status === "read" || summary.status === "archived") &&
      (summary.priority === "low" || summary.priority === "normal"),
  );

  // 5. Filter: statuses ["unread"], priorities ["high", "normal", "low"], expect all unread of any non-null priority
  const requestUnreadAnyPriority: IShoppingMallAdminNotification.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminId,
    statuses: ["unread"],
    priorities: ["high", "normal", "low"],
  };

  await assertFilteredSearch(
    "filter unread + any non-null priority",
    requestUnreadAnyPriority,
    (summary) =>
      summary.status === "unread" &&
      (summary.priority === "high" ||
        summary.priority === "normal" ||
        summary.priority === "low"),
  );

  // 6. Pagination behavior check with a small limit: unread + any priority
  const requestUnreadPaged: IShoppingMallAdminNotification.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    shopping_mall_admin_id: adminId,
    statuses: ["unread"],
  };

  const firstPage =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      connection,
      { body: requestUnreadPaged },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(firstPage);
  const unreadTotal = firstPage.pagination.records;

  TestValidator.predicate(
    "pagination - first page limit respected",
    firstPage.data.length <= requestUnreadPaged.limit!,
  );

  if (unreadTotal > requestUnreadPaged.limit!) {
    const secondPageRequest: IShoppingMallAdminNotification.IRequest = {
      ...requestUnreadPaged,
      page: ((requestUnreadPaged.page || 1) + 1) as number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
    };

    const secondPage =
      await api.functional.shoppingMall.admin.adminNotifications.index(
        connection,
        { body: secondPageRequest },
      );
    typia.assert<IPageIShoppingMallAdminNotification.ISummary>(secondPage);

    TestValidator.equals(
      "pagination - total records stable across pages",
      secondPage.pagination.records,
      unreadTotal,
    );
  }
}
