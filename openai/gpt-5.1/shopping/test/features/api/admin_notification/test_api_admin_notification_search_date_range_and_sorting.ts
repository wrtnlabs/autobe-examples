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

export async function test_api_admin_notification_search_date_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;

  // Helper to create a notification for this admin
  const createNotification = async (
    overrides?: Partial<IShoppingMallAdminNotification.ICreate>,
  ) => {
    const baseBody = {
      shopping_mall_admin_id: adminId,
      related_risk_case_id: null,
      related_legal_hold_id: null,
      type: RandomGenerator.paragraph({ sentences: 1 }),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.paragraph({ sentences: 4 }),
      status: "unread",
      priority: RandomGenerator.pick(["low", "normal", "high"] as const),
      entity_type: null,
      entity_id: null,
      entity_display: null,
      read_at: null,
      archived_at: null,
      ...overrides,
    } satisfies IShoppingMallAdminNotification.ICreate;

    const created =
      await api.functional.shoppingMall.admin.adminNotifications.create(
        connection,
        { body: baseBody },
      );
    typia.assert<IShoppingMallAdminNotification>(created);
    return created;
  };

  // 2. Create notifications in three temporal groups (early, mid, late)
  const earlyNotifications: IShoppingMallAdminNotification[] = [];
  const midNotifications: IShoppingMallAdminNotification[] = [];
  const lateNotifications: IShoppingMallAdminNotification[] = [];

  // Early batch
  for (let i = 0; i < 3; i++) {
    const created = await createNotification({ status: "unread" });
    earlyNotifications.push(created);
  }

  // Mid-range batch
  for (let i = 0; i < 5; i++) {
    const created = await createNotification({ status: "unread" });
    midNotifications.push(created);
  }

  // Late batch
  for (let i = 0; i < 3; i++) {
    const created = await createNotification({ status: "unread" });
    lateNotifications.push(created);
  }

  // Basic sanity checks on created counts
  TestValidator.equals(
    "early notifications count",
    earlyNotifications.length,
    3,
  );
  TestValidator.equals("mid notifications count", midNotifications.length, 5);
  TestValidator.equals("late notifications count", lateNotifications.length, 3);

  // Compute a date window based on the mid batch
  const sortByCreatedAtAsc = (
    a: { created_at: string },
    b: { created_at: string },
  ) => a.created_at.localeCompare(b.created_at);

  const midSorted = [...midNotifications].sort(sortByCreatedAtAsc);
  const createdFrom = midSorted[0]?.created_at;
  const createdTo = midSorted[midSorted.length - 1]?.created_at;

  TestValidator.predicate(
    "created_from should be defined",
    createdFrom !== undefined,
  );
  TestValidator.predicate(
    "created_to should be defined",
    createdTo !== undefined,
  );

  if (!createdFrom || !createdTo) return;

  // 3. Query notifications within date range, ordered by created_at desc
  const descRequestBody = {
    shopping_mall_admin_id: adminId,
    created_from: createdFrom,
    created_to: createdTo,
    order_by: "created_at",
    order_direction: "desc",
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const descPage =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      connection,
      { body: descRequestBody },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(descPage);

  const descData = descPage.data;

  // 4. Assert all results within date window
  for (const summary of descData) {
    TestValidator.predicate(
      "summary.created_at within [created_from, created_to] (desc)",
      summary.created_at >= createdFrom && summary.created_at <= createdTo,
    );
  }

  // 5. Assert descending created_at order
  for (let i = 1; i < descData.length; i++) {
    const prev = descData[i - 1];
    const curr = descData[i];
    TestValidator.predicate(
      `created_at should be non-increasing at index ${i} (desc)`,
      prev.created_at >= curr.created_at,
    );
  }

  // 6. Repeat with ascending order
  const ascRequestBody = {
    shopping_mall_admin_id: adminId,
    created_from: createdFrom,
    created_to: createdTo,
    order_by: "created_at",
    order_direction: "asc",
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const ascPage =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      connection,
      { body: ascRequestBody },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(ascPage);

  const ascData = ascPage.data;

  // Assert ascending created_at order
  for (let i = 1; i < ascData.length; i++) {
    const prev = ascData[i - 1];
    const curr = ascData[i];
    TestValidator.predicate(
      `created_at should be non-decreasing at index ${i} (asc)`,
      prev.created_at <= curr.created_at,
    );
  }
}
