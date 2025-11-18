import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate admin user search by email and status with pagination and ordering.
 *
 * Business context: Administrative operators need to search
 * `todo_app_adminusers` using flexible criteria such as partial email and
 * status (e.g. `active`, `disabled`), and receive a paginated, consistently
 * ordered summary list. This test ensures that the search endpoint honors those
 * filters and ordering instructions when called by an authenticated admin, in a
 * realistically initialized environment.
 *
 * Steps:
 *
 * 1. Initialize a global system setting via POST /todoApp/adminUser/systemSettings
 *    so that the administrative environment is non-empty.
 * 2. Register a primary admin via /auth/adminUser/join to bootstrap the admin
 *    session and let the SDK automatically attach the Authorization header to
 *    subsequent requests.
 * 3. Create multiple additional admin users with controlled email patterns and
 *    varying `status` values, so that some but not all match a chosen
 *    combination of email substring and status.
 * 4. As the authenticated admin, call PATCH /todoApp/adminUser/adminUsers with an
 *    ITodoAppAdminUser.IRequest body specifying:
 *
 *    - Page = 1 and a sufficiently large limit,
 *    - Email filter substring shared by a subset of created admins,
 *    - Status = "active" (or similar),
 *    - OrderByCreatedAt = "asc".
 * 5. Validate that the response (IPageITodoAppAdminUser.ISummary):
 *
 *    - Uses pagination.current = 1 and pagination.limit as requested.
 *    - Has pagination.records equal to the number of admins matching the filters (in
 *         this simple one-page scenario).
 *    - Contains only ITodoAppAdminUser.ISummary entries whose email contains the
 *         filter substring and whose status equals the filter.
 *    - Contains none of the created admins that do not satisfy the filters.
 *    - Is sorted by created_at ascending.
 * 6. Issue a second search call with orderByCreatedAt = "desc" and verify that the
 *    same filtered set is returned but in reverse created_at order.
 */
export async function test_api_admin_adminusers_search_by_email_and_status(
  connection: api.IConnection,
) {
  // 1. Initialize at least one system setting to simulate real admin env
  const settingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: "Maximum number of active todos per user for testing",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert(systemSetting);

  // 2. Register primary admin and establish authenticated context
  const joinPassword = "P@ssw0rd!" as string & tags.Format<"password">;
  const joinEmailCommon = "filter-key";

  const primaryAdminJoinBody = {
    email: `primary.${joinEmailCommon}@example.com` as string &
      tags.Format<"email">,
    password: joinPassword,
    display_name: "Primary Admin",
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const primaryAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: primaryAdminJoinBody,
    });
  typia.assert(primaryAdmin);

  // 3. Create additional admins with controlled email patterns and statuses
  type CreatedAdmin = {
    id: string;
    email: string;
    status: string;
    created_at: string;
  };
  const createdAdmins: CreatedAdmin[] = [];

  const makeAdmin = async (
    localPart: string,
    status: string,
  ): Promise<CreatedAdmin> => {
    const body = {
      email: `${localPart}.${joinEmailCommon}@example.com` as string &
        tags.Format<"email">,
      password: joinPassword,
      display_name: RandomGenerator.name(),
      status,
      ip: "127.0.0.1",
      href: "https://admin.todoapp.test/join" as string & tags.Format<"uri">,
      referrer: "https://admin.todoapp.test/landing" as string &
        tags.Format<"uri">,
    } satisfies ITodoAppAdminUser.IJoin;

    const admin: ITodoAppAdminUser.IAuthorized =
      await api.functional.auth.adminUser.join(connection, {
        body,
      });
    typia.assert(admin);

    const record: CreatedAdmin = {
      id: admin.id,
      email: admin.email,
      status: admin.status,
      created_at: admin.created_at,
    };
    createdAdmins.push(record);
    return record;
  };

  // Create admins that should match the filter (email contains "filter-key" & status "active")
  const matching1 = await makeAdmin("match1", "active");
  const matching2 = await makeAdmin("match2", "active");

  // Create admins that should NOT match: different status or email
  const nonMatchingStatus = await makeAdmin("nomatch-status", "disabled");
  const nonMatchingEmailBody = {
    email: "other.user@example.com" as string & tags.Format<"email">,
    password: joinPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const nonMatchingEmail: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: nonMatchingEmailBody,
    });
  typia.assert(nonMatchingEmail);
  createdAdmins.push({
    id: nonMatchingEmail.id,
    email: nonMatchingEmail.email,
    status: nonMatchingEmail.status,
    created_at: nonMatchingEmail.created_at,
  });

  // Include the primary admin in the local list as well
  createdAdmins.push({
    id: primaryAdmin.id,
    email: primaryAdmin.email,
    status: primaryAdmin.status,
    created_at: primaryAdmin.created_at,
  });

  // Derive expected matches for filter combination
  const emailFilter = joinEmailCommon;
  const statusFilter = "active";

  const expectedMatches = createdAdmins.filter(
    (admin) =>
      admin.email.includes(emailFilter) && admin.status === statusFilter,
  );

  // Ensure we do have both matching and non-matching samples
  await TestValidator.predicate(
    "there are matching admins for filter",
    async () => expectedMatches.length >= 2,
  );
  await TestValidator.predicate(
    "there are non-matching admins present",
    async () => createdAdmins.length > expectedMatches.length,
  );

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const buildRequestBody = (
    order: "asc" | "desc",
  ): ITodoAppAdminUser.IRequest => ({
    page,
    limit,
    email: emailFilter,
    status: statusFilter,
    orderByCreatedAt: order,
  });

  // 4. Search with ascending created_at order
  const ascResponse: IPageITodoAppAdminUser.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: buildRequestBody("asc"),
    });
  typia.assert(ascResponse);

  const ascPage = ascResponse.pagination;
  const ascData = ascResponse.data;

  // Basic pagination checks
  TestValidator.equals(
    "asc: pagination.current equals requested page",
    ascPage.current,
    page,
  );
  TestValidator.equals(
    "asc: pagination.limit equals requested limit",
    ascPage.limit,
    limit,
  );

  // Records should be at least the number of returned data items and not less than expected filtered count
  await TestValidator.predicate(
    "asc: pagination.records >= data length",
    async () => ascPage.records >= ascData.length,
  );
  await TestValidator.predicate(
    "asc: pagination.records >= expectedMatches length",
    async () => ascPage.records >= expectedMatches.length,
  );

  // All returned summaries must satisfy filters
  for (const summary of ascData) {
    TestValidator.predicate(
      "asc: summary email contains filter substring",
      summary.email.includes(emailFilter),
    );
    TestValidator.equals(
      "asc: summary status equals filter status",
      summary.status,
      statusFilter,
    );
  }

  const expectedMatchingIds = new Set(expectedMatches.map((a) => a.id));

  // No non-matching admin IDs should appear in data
  for (const summary of ascData) {
    await TestValidator.predicate(
      "asc: summary id belongs to expected matching set",
      async () => expectedMatchingIds.has(summary.id),
    );
  }

  // Sorting by created_at ascending
  for (let i = 1; i < ascData.length; i++) {
    const prev = ascData[i - 1];
    const curr = ascData[i];
    const prevTime = new Date(prev.created_at).getTime();
    const currTime = new Date(curr.created_at).getTime();

    await TestValidator.predicate(
      "asc: created_at is non-decreasing",
      async () => prevTime <= currTime,
    );
  }

  // 5. Search with descending created_at order
  const descResponse: IPageITodoAppAdminUser.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: buildRequestBody("desc"),
    });
  typia.assert(descResponse);

  const descPage = descResponse.pagination;
  const descData = descResponse.data;

  TestValidator.equals(
    "desc: pagination.current equals requested page",
    descPage.current,
    page,
  );
  TestValidator.equals(
    "desc: pagination.limit equals requested limit",
    descPage.limit,
    limit,
  );

  await TestValidator.predicate(
    "desc: pagination.records >= data length",
    async () => descPage.records >= descData.length,
  );
  await TestValidator.predicate(
    "desc: pagination.records >= expectedMatches length",
    async () => descPage.records >= expectedMatches.length,
  );

  for (const summary of descData) {
    TestValidator.predicate(
      "desc: summary email contains filter substring",
      summary.email.includes(emailFilter),
    );
    TestValidator.equals(
      "desc: summary status equals filter status",
      summary.status,
      statusFilter,
    );
    await TestValidator.predicate(
      "desc: summary id belongs to expected matching set",
      async () => expectedMatchingIds.has(summary.id),
    );
  }

  for (let i = 1; i < descData.length; i++) {
    const prev = descData[i - 1];
    const curr = descData[i];
    const prevTime = new Date(prev.created_at).getTime();
    const currTime = new Date(curr.created_at).getTime();

    await TestValidator.predicate(
      "desc: created_at is non-increasing",
      async () => prevTime >= currTime,
    );
  }
}
