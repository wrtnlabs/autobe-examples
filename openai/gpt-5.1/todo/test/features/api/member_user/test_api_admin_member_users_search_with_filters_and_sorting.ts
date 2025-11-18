import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_member_users_search_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate an admin user via join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Configure a system setting as admin: max_active_todos_per_user enabled=true
  const settingKey = "max_active_todos_per_user";
  const systemSettingBody = {
    key: settingKey,
    value: "100", // numeric limit encoded as string
    type: "int",
    description: "Maximum number of active todos per member user for testing",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);
  TestValidator.equals(
    "system setting key should match",
    systemSetting.key,
    settingKey,
  );

  // 3. Create multiple member users with different identities
  // We will create three member users: two intended as active (one will have a todo), one extra.
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const makeMemberJoinBody = (
    email: string & tags.Format<"email">,
    password: string & tags.Format<"password">,
    displayName: string,
  ): ITodoAppMemberUserJoin.ICreate => ({
    email,
    password,
    displayName,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  });

  const activeEmail1: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const activeEmail2: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const otherEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const activePassword1: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const activePassword2: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const otherPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const activeDisplayName1 = RandomGenerator.name(2);
  const activeDisplayName2 = RandomGenerator.name(2);
  const otherDisplayName = RandomGenerator.name(2);

  const member1: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: makeMemberJoinBody(
        activeEmail1,
        activePassword1,
        activeDisplayName1,
      ),
    });
  typia.assert(member1);

  const member2: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: makeMemberJoinBody(
        activeEmail2,
        activePassword2,
        activeDisplayName2,
      ),
    });
  typia.assert(member2);

  const member3: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: makeMemberJoinBody(otherEmail, otherPassword, otherDisplayName),
    });
  typia.assert(member3);

  const activeMembers: ITodoAppMemberUser.IAuthorized[] = [member1, member2];
  const otherMembers: ITodoAppMemberUser.IAuthorized[] = [member3];

  // At least member1 should be active according to the backend's default rules
  TestValidator.equals(
    "member1 status should be active",
    activeMembers[0].status,
    "active",
  );

  // 4. Ensure at least one member has a todo
  // Login as member1 using the same credentials used at join time
  const memberLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const member1LoginBody = {
    email: member1.email,
    password: activePassword1,
    ip: null,
    href: memberLoginHref,
    referrer: memberLoginReferrer,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const member1Login: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member1LoginBody,
    });
  typia.assert(member1Login);

  // Create a todo for member1
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: new Date().toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);
  TestValidator.equals(
    "todo member id should match member1",
    todo.memberUser.id,
    member1.id,
  );

  // Capture member created_at timestamps for date range filter
  const createdAtValues: string[] = activeMembers
    .map((m) => m.created_at)
    .concat(otherMembers.map((m) => m.created_at));

  const sortedCreatedAt = [...createdAtValues].sort((a, b) =>
    a.localeCompare(b),
  );
  const createdFrom = sortedCreatedAt[0];
  const createdTo = sortedCreatedAt[sortedCreatedAt.length - 1];

  // 5. Switch back to admin context via explicit login
  const adminLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminLoginBody = {
    email: admin.email,
    password: adminPassword,
    ip: null,
    href: adminLoginHref,
    referrer: adminLoginReferrer,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 6. Call PATCH /todoApp/adminUser/memberUsers with ITodoAppMemberUser.IRequest
  // Use a search term that matches member1 display_name or email
  const searchTerm = member1.display_name ?? member1.email;

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: "active",
    search: searchTerm,
    created_from: createdFrom,
    created_to: createdTo,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppMemberUser.IRequest;

  const pageResult: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  const summaries: ITodoAppMemberUser.ISummary[] = pageResult.data;

  // 7. Validate that all returned summaries satisfy business conditions
  for (const summary of summaries) {
    TestValidator.equals(
      "member summary status should be active",
      summary.status,
      "active",
    );

    TestValidator.predicate(
      "member created_at within requested range",
      summary.created_at >= createdFrom && summary.created_at <= createdTo,
    );

    if (requestBody.search && requestBody.search.length > 0) {
      const lowerSearch = requestBody.search.toLowerCase();
      const emailMatch = summary.email.toLowerCase().includes(lowerSearch);
      const displayMatch = (summary.display_name ?? "")
        .toLowerCase()
        .includes(lowerSearch);
      TestValidator.predicate(
        "email or display_name should match search term when provided",
        emailMatch || displayMatch,
      );
    }
  }

  // Verify ordering: created_at descending
  for (let i = 1; i < summaries.length; i++) {
    const prev = summaries[i - 1];
    const curr = summaries[i];
    TestValidator.predicate(
      "results should be ordered by created_at descending",
      prev.created_at >= curr.created_at,
    );
  }

  // 8. Confirm pagination metadata consistency
  TestValidator.predicate(
    "pagination current page matches request",
    pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is at least requested limit",
    pagination.limit >= 5,
  );

  TestValidator.predicate(
    "pagination records should be >= data length",
    pagination.records >= summaries.length,
  );

  if (pagination.limit > 0) {
    TestValidator.predicate(
      "pagination pages * limit covers records",
      pagination.pages * pagination.limit >= pagination.records,
    );
  }
}
