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

/**
 * Validate basic pagination search for admin notifications.
 *
 * This E2E scenario ensures that an authenticated admin can retrieve their
 * administrative notifications through the PATCH
 * /shoppingMall/admin/adminNotifications endpoint using only minimal pagination
 * parameters. It verifies both the structural correctness of the paginated
 * response and the scoping of notifications to the authenticated
 * administrator.
 *
 * Business workflow:
 *
 * 1. Register a new admin using POST /auth/admin/join, which also issues JWT
 *    tokens and wires Authorization header into the connection.
 * 2. Using that authenticated admin context, create multiple notification records
 *    via POST /shoppingMall/admin/adminNotifications, all pointing to this
 *    admin as shopping_mall_admin_id, but with varied attributes (type, status,
 *    priority, entity metadata).
 * 3. Call PATCH /shoppingMall/admin/adminNotifications with an
 *    IShoppingMallAdminNotification.IRequest body containing only page and
 *    limit to perform a basic paginated search with no additional filters.
 * 4. Assert that the response is a valid
 *    IPageIShoppingMallAdminNotification.ISummary, that pagination metadata is
 *    coherent, and that the number of records in data does not exceed the
 *    requested limit.
 * 5. Confirm that each returned notification summary belongs to the created admin
 *    and that key fields (id, admin, type, title, status, created_at,
 *    updated_at) are populated.
 * 6. Optionally, exercise a second page to confirm that pagination works
 *    consistently and that there is no overlap in IDs between pages when more
 *    than one page of data exists.
 */
export async function test_api_admin_notification_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join) to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.test.shoppingmall.local/join",
    referrer: "https://admin.test.shoppingmall.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;

  // 2. Create multiple notifications for this admin
  const notificationCount = 15;
  const createdNotifications: IShoppingMallAdminNotification[] =
    await ArrayUtil.asyncRepeat(notificationCount, async (index) => {
      const body = {
        shopping_mall_admin_id: adminId,
        related_risk_case_id: null,
        related_legal_hold_id: null,
        type: RandomGenerator.pick([
          "risk_sla_violation",
          "seller_approval_needed",
          "refund_escalation",
        ] as const),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
        status: RandomGenerator.pick(["unread", "read", "archived"] as const),
        priority: RandomGenerator.pick(["low", "normal", "high"] as const),
        entity_type: RandomGenerator.pick([
          "order",
          "seller",
          "risk_case",
        ] as const),
        entity_id: typia.random<string & tags.Format<"uuid">>(),
        entity_display: RandomGenerator.paragraph({ sentences: 2 }),
        read_at: null,
        archived_at: null,
      } satisfies IShoppingMallAdminNotification.ICreate;

      const created =
        await api.functional.shoppingMall.admin.adminNotifications.create(
          connection,
          { body },
        );
      typia.assert<IShoppingMallAdminNotification>(created);
      return created;
    });

  // Avoid unused variable warning in some environments
  void createdNotifications;

  // 3. Perform basic pagination search with only page and limit
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallAdminNotification.IRequest;

  const page1: IPageIShoppingMallAdminNotification.ISummary =
    await api.functional.shoppingMall.admin.adminNotifications.index(
      connection,
      { body: requestPage1 },
    );
  typia.assert<IPageIShoppingMallAdminNotification.ISummary>(page1);

  // 4. Validate pagination metadata and size constraints
  const pagination1 = page1.pagination;
  TestValidator.equals(
    "page 1 current index should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should equal requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.predicate(
    "records should be at least number of returned items",
    pagination1.records >= page1.data.length,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    page1.data.length <= limit,
  );

  TestValidator.predicate(
    "pages should be coherent with records and limit",
    (() => {
      if (pagination1.limit === 0) return pagination1.pages === 0;
      const expectedPages =
        Math.ceil(pagination1.records / pagination1.limit) || 0;
      return pagination1.pages === expectedPages;
    })(),
  );

  // 5. Validate each summary belongs to this admin and has mandatory fields
  for (const summary of page1.data) {
    TestValidator.equals(
      "summary.admin.id should equal created admin id",
      summary.admin.id,
      adminId,
    );

    TestValidator.predicate(
      "summary.id must be non-empty string",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary.type must be non-empty string",
      typeof summary.type === "string" && summary.type.length > 0,
    );
    TestValidator.predicate(
      "summary.title must be non-empty string",
      typeof summary.title === "string" && summary.title.length > 0,
    );
    TestValidator.predicate(
      "summary.status must be non-empty string",
      typeof summary.status === "string" && summary.status.length > 0,
    );
    TestValidator.predicate(
      "summary.created_at must be non-empty string",
      typeof summary.created_at === "string" && summary.created_at.length > 0,
    );
    TestValidator.predicate(
      "summary.updated_at must be non-empty string",
      typeof summary.updated_at === "string" && summary.updated_at.length > 0,
    );
  }

  // 6. Optionally request page 2 to check pagination behavior
  if (pagination1.pages > 1) {
    const requestPage2 = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit,
    } satisfies IShoppingMallAdminNotification.IRequest;

    const page2: IPageIShoppingMallAdminNotification.ISummary =
      await api.functional.shoppingMall.admin.adminNotifications.index(
        connection,
        { body: requestPage2 },
      );
    typia.assert<IPageIShoppingMallAdminNotification.ISummary>(page2);

    const pagination2 = page2.pagination;
    TestValidator.equals(
      "page 2 current index should be 2",
      pagination2.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should equal requested limit",
      pagination2.limit,
      limit,
    );

    TestValidator.predicate(
      "page 2 data length should not exceed limit",
      page2.data.length <= limit,
    );

    // Ensure no overlap of IDs between first and second page when both non-empty
    if (page1.data.length > 0 && page2.data.length > 0) {
      const idsPage1 = new Set(page1.data.map((s) => s.id));
      const overlap = page2.data.some((s) => idsPage1.has(s.id));
      TestValidator.predicate(
        "no overlapping notification IDs between page 1 and 2",
        overlap === false,
      );
    }

    for (const summary of page2.data) {
      TestValidator.equals(
        "page 2 summary.admin.id should equal created admin id",
        summary.admin.id,
        adminId,
      );
    }
  }
}
