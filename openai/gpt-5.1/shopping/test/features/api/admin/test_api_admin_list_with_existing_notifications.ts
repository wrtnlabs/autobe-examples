import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate listing administrator accounts when governance notifications exist.
 *
 * Business flow:
 *
 * 1. Register an initial administrator (Admin A) using POST /auth/admin/join. This
 *    also authenticates the SDK connection with Admin A's access token.
 * 2. As Admin A, create at least one admin notification targeting Admin A via POST
 *    /shoppingMall/admin/adminNotifications.
 * 3. Still as Admin A, call PATCH /shoppingMall/admin/admins with
 *    IShoppingMallAdmin.IRequest using explicit pagination (page=1, limit=10)
 *    without over-constraining filters so that Admin A is included in the
 *    result set.
 * 4. Assert the response type and pagination metadata and confirm that Admin A
 *    appears in the page with coherent summary fields (id, email, status,
 *    email_verified, created_at, updated_at, deleted_at).
 * 5. Verify RBAC by attempting to call the same admins.index endpoint using a
 *    separate connection instance without the Authorization header and
 *    expecting an HTTP error.
 */
export async function test_api_admin_list_with_existing_notifications(
  connection: api.IConnection,
) {
  // 1. Create initial administrator (Admin A) using join endpoint.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an admin notification for Admin A so that governance data exists.
  const notificationBody = {
    shopping_mall_admin_id: adminAuthorized.id,
    related_risk_case_id: null,
    related_legal_hold_id: null,
    type: "risk_sla_violation",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "unread",
    priority: "high",
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const notification: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      { body: notificationBody },
    );
  typia.assert(notification);

  TestValidator.equals(
    "notification admin id should match Admin A id",
    notification.admin?.id ?? adminAuthorized.id,
    adminAuthorized.id,
  );

  // 3. List admins with pagination through PATCH /shoppingMall/admin/admins.
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdmin.IRequest;

  const page: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination current page should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 1 when an admin exists",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be >= 1 when records exist",
    pagination.pages >= 1,
  );

  TestValidator.predicate(
    "admin list should contain at least one admin",
    page.data.length >= 1,
  );

  const foundAdmin = page.data.find((row) => row.id === adminAuthorized.id);
  TestValidator.predicate(
    "Admin A should be present in admin listing",
    foundAdmin !== undefined,
  );

  if (foundAdmin !== undefined) {
    typia.assert<IShoppingMallAdmin.ISummary>(foundAdmin);
    TestValidator.equals(
      "Admin A email in summary should match join email",
      foundAdmin.email,
      adminAuthorized.email,
    );
    TestValidator.equals(
      "Admin A status summary should match authorized status",
      foundAdmin.status,
      adminAuthorized.status,
    );
    TestValidator.equals(
      "Admin A email_verified summary should match authorized flag",
      foundAdmin.email_verified,
      adminAuthorized.email_verified,
    );
    TestValidator.equals(
      "Admin A deleted_at should be null on fresh join",
      foundAdmin.deleted_at ?? null,
      null,
    );
  }

  // 5. RBAC check: unauthenticated connection must not be allowed.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated admin listing should be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.admins.index(unauthenticated, {
        body: requestBody,
      });
    },
  );
}
