import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReport";

/**
 * Verify assignment-based filtering on the admin user report queue.
 *
 * This E2E test validates that the adminUser moderation queue endpoint
 * `/communityPlatform/adminUser/reports/queues/user` honors the
 * `assigned_adminuser_id` filter in `ICommunityPlatformUserReport.IRequest`, so
 * that different admins can retrieve queues scoped to their own assignments.
 *
 * Business workflow (adapted to available APIs):
 *
 * 1. Create two admin users (adminA and adminB) via /auth/adminUser/join.
 *
 *    - Joining also authenticates them; we will later re-login when switching.
 * 2. Create a memberUser via /auth/memberUser/join.
 * 3. As the memberUser, generate multiple user reports against that same member
 *    (or other members) via POST /communityPlatform/memberUser/userReports.
 *
 *    - We do not control assignment; backend may or may not assign reports to
 *         particular admins automatically.
 * 4. As adminA, call PATCH /communityPlatform/adminUser/reports/queues/user
 *    (api.functional.communityPlatform.adminUser.reports.queues.user.index)
 *    with a body of type ICommunityPlatformUserReport.IRequest that includes
 *    `assigned_adminuser_id: adminA.id` and some pagination parameters.
 * 5. As adminB, call the same endpoint with `assigned_adminuser_id: adminB.id`.
 * 6. Because the response summary type does not expose assigned admin, we validate
 *    the correctness of filtering indirectly:
 *
 *    - Ensure that each call is type-safe (typia.assert on responses).
 *    - Ensure that the sets of report IDs returned for adminA and adminB are
 *         disjoint (no overlap), showing that the filter differentiates
 *         queues.
 *    - Ensure that calling the endpoint twice for the same admin and same filter
 *         yields a stable set of IDs for the first page (idempotent within the
 *         test run).
 *    - Validate basic pagination invariants: limit consistency with data length, and
 *         that pagination.records >= data.length.
 *
 * NOTE: We cannot explicitly update assignment because no public update API is
 * available in the provided SDK. Therefore, the test does not assert that a
 * particular report is assigned to a particular admin; instead, it verifies
 * that the `assigned_adminuser_id` filter itself behaves consistently and
 * partitions the queue space between admins when assignments exist.
 */
export async function test_api_admin_user_reports_queue_assignment_filtering(
  connection: api.IConnection,
) {
  // 1. Register two admin users (adminA, adminB)
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminAJoinBody = {
    username: RandomGenerator.name(1),
    email: adminAEmail,
    password: "AdminA_pwd_1234", // satisfies Format<"password">
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuthorized);

  const adminBAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: adminBEmail,
        password: "AdminB_pwd_1234",
      } satisfies ICommunityPlatformAdminUserJoin.IRequest,
    });
  typia.assert(adminBAuthorized);

  // 2. Create a memberUser who will file reports
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "Member_pwd_1234",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const reportedMemberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 3. As memberUser, create multiple user reports
  const reportCount: number & tags.Type<"int32"> = 6 as number &
    tags.Type<"int32">;

  const createdReports: ICommunityPlatformUserReport[] = [];
  for (let i = 0; i < reportCount; i++) {
    const createBody = {
      reported_memberuser_id: reportedMemberId,
      reason_category: i % 2 === 0 ? "harassment" : "spam",
      reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
      status: "open",
      severity: i % 3 === 0 ? "high" : "medium",
    } satisfies ICommunityPlatformUserReport.ICreate;

    const created: ICommunityPlatformUserReport =
      await api.functional.communityPlatform.memberUser.userReports.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(created);
    createdReports.push(created);
  }

  TestValidator.predicate(
    "createdReports length matches reportCount",
    createdReports.length === reportCount,
  );

  // Helper to login as a given admin
  const loginAsAdmin = async (
    email: string & tags.Format<"email">,
  ): Promise<ICommunityPlatformAdminuser.IAuthorized> => {
    const loginBody = {
      identifier: email,
      password: email === adminAEmail ? "AdminA_pwd_1234" : "AdminB_pwd_1234",
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin/landing",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest;

    const authorized: ICommunityPlatformAdminuser.IAuthorized =
      await api.functional.auth.adminUser.login(connection, {
        body: loginBody,
      });
    typia.assert(authorized);
    return authorized;
  };

  // 4. Login as adminA and query queue filtered by adminA.id
  const adminALogin = await loginAsAdmin(adminAEmail);
  const adminAQueueRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    assigned_adminuser_id: adminALogin.id,
  } satisfies ICommunityPlatformUserReport.IRequest;

  const adminAQueue: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.user.index(
      connection,
      {
        body: adminAQueueRequest,
      },
    );
  typia.assert(adminAQueue);

  const adminAIds = adminAQueue.data.map((summary) => summary.id);

  // Basic pagination invariants for adminA
  TestValidator.predicate(
    "adminA pagination limit >= data length",
    adminAQueue.pagination.limit >= adminAQueue.data.length,
  );
  TestValidator.predicate(
    "adminA pagination records >= data length",
    adminAQueue.pagination.records >= adminAQueue.data.length,
  );

  // Call again for determinism with same filter
  const adminAQueueAgain: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.user.index(
      connection,
      {
        body: adminAQueueRequest,
      },
    );
  typia.assert(adminAQueueAgain);

  const adminAIdsAgain = adminAQueueAgain.data.map((summary) => summary.id);

  TestValidator.equals(
    "adminA queue IDs stable across repeated calls",
    adminAIds,
    adminAIdsAgain,
  );

  // 5. Login as adminB and query queue filtered by adminB.id
  const adminBLogin = await loginAsAdmin(adminBEmail);
  const adminBQueueRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    assigned_adminuser_id: adminBLogin.id,
  } satisfies ICommunityPlatformUserReport.IRequest;

  const adminBQueue: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.user.index(
      connection,
      {
        body: adminBQueueRequest,
      },
    );
  typia.assert(adminBQueue);

  const adminBIds = adminBQueue.data.map((summary) => summary.id);

  // Basic pagination invariants for adminB
  TestValidator.predicate(
    "adminB pagination limit >= data length",
    adminBQueue.pagination.limit >= adminBQueue.data.length,
  );
  TestValidator.predicate(
    "adminB pagination records >= data length",
    adminBQueue.pagination.records >= adminBQueue.data.length,
  );

  // 6. Validate that adminA and adminB queues are disjoint in IDs when both have data
  if (adminAIds.length > 0 && adminBIds.length > 0) {
    const overlap = adminAIds.filter((id) => adminBIds.includes(id));
    TestValidator.equals(
      "adminA and adminB queues must not share report IDs",
      overlap,
      [],
    );
  }
}
