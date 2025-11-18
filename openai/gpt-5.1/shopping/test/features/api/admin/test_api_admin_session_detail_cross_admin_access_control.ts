import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Validate cross-admin access to detailed admin session records.
 *
 * Business goal: Ensure that when multiple shopping mall administrators exist,
 * an admin can retrieve a detailed session record belonging to another admin
 * when the governance model allows such cross-admin inspection.
 *
 * Scenario steps:
 *
 * 1. Create Admin B via POST /auth/admin/join.
 * 2. While authenticated as Admin B, list Admin B's sessions via PATCH
 *    /shoppingMall/admin/admins/{adminId}/sessions and pick one sessionId.
 * 3. Create Admin C via POST /auth/admin/join to obtain a different admin context
 *    (not the owner of the selected session).
 * 4. While authenticated as Admin C, call GET
 *    /shoppingMall/admin/admins/{adminId}/sessions/{sessionId} with adminId set
 *    to Admin B's id and the previously captured sessionId.
 * 5. Verify that the detailed session belongs to Admin B and that key fields are
 *    consistent between the summary and detail responses.
 */
export async function test_api_admin_session_detail_cross_admin_access_control(
  connection: api.IConnection,
) {
  // 1. Create Admin B who will own the session we inspect later.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  const adminBId: string & tags.Format<"uuid"> = adminB.id;

  // 2. While authenticated as Admin B (join call above has set the
  //    Authorization header accordingly), list Admin B's sessions.
  const sessionSearchRequest = {
    page: typia.random<number & tags.Type<"int32">>(),
    limit: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallAdminSession.IRequest;

  const adminBSessionsPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: adminBId,
      body: sessionSearchRequest,
    });
  typia.assert<IPageIShoppingMallAdminSession.ISummary>(adminBSessionsPage);

  // Expect at least one session for Admin B (join should create a session).
  TestValidator.predicate(
    "admin B sessions should not be empty",
    adminBSessionsPage.data.length > 0,
  );

  const sessionSummary: IShoppingMallAdminSession.ISummary =
    adminBSessionsPage.data[0];
  typia.assert<IShoppingMallAdminSession.ISummary>(sessionSummary);

  // Ensure the summary's admin id matches Admin B's id.
  TestValidator.equals(
    "session summary admin id matches admin B id",
    sessionSummary.admin.id,
    adminBId,
  );

  const sessionId: string & tags.Format<"uuid"> = sessionSummary.id;

  // 3. Create Admin C to represent a different admin attempting
  //    cross-admin inspection of Admin B's session.
  const adminCJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminC: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminC);

  const adminCId: string & tags.Format<"uuid"> = adminC.id;

  // Ensure Admin C is distinct from Admin B (sanity check).
  TestValidator.notEquals(
    "admin C id should be different from admin B id",
    adminCId,
    adminBId,
  );

  // 4. While authenticated as Admin C, attempt to retrieve Admin B's
  //    session detail.
  const detailedSession: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.sessions.at(connection, {
      adminId: adminBId,
      sessionId,
    });
  typia.assert<IShoppingMallAdminSession>(detailedSession);

  // 5. Validate that the detailed session belongs to Admin B and that
  //    key fields are consistent with the summary.
  TestValidator.equals(
    "detailed session id matches summary session id",
    detailedSession.id,
    sessionId,
  );

  TestValidator.equals(
    "detailed session belongs to admin B via foreign key",
    detailedSession.shopping_mall_admin_id,
    adminBId,
  );

  TestValidator.equals(
    "ip matches between summary and detail",
    detailedSession.ip,
    sessionSummary.ip,
  );

  TestValidator.equals(
    "href matches between summary and detail",
    detailedSession.href,
    sessionSummary.href,
  );

  TestValidator.equals(
    "referrer matches between summary and detail",
    detailedSession.referrer,
    sessionSummary.referrer,
  );

  TestValidator.equals(
    "created_at matches between summary and detail",
    detailedSession.created_at,
    sessionSummary.created_at,
  );

  // expired_at can be undefined or null; only compare when both sides
  // are non-nullish to avoid false negatives.
  if (
    detailedSession.expired_at !== null &&
    detailedSession.expired_at !== undefined &&
    sessionSummary.expired_at !== null &&
    sessionSummary.expired_at !== undefined
  ) {
    TestValidator.equals(
      "expired_at matches between summary and detail when present",
      detailedSession.expired_at,
      sessionSummary.expired_at,
    );
  }
}
