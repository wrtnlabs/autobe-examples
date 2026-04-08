import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_permission_category_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test org category filter
  const orgPermissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: { category: "org" } satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(orgPermissions);
  TestValidator.equals(
    "org category has correct count",
    orgPermissions.data.length,
    1,
  );
  TestValidator.predicate("org permission name starts with org:", () =>
    orgPermissions.data[0].permission_name.startsWith("org:"),
  );
  // 3. Test employee category filter
  const employeePermissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: { category: "employee" } satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(employeePermissions);
  TestValidator.equals(
    "employee category has correct count",
    employeePermissions.data.length,
    2,
  );
  for (const permission of employeePermissions.data) {
    TestValidator.predicate(
      "employee permission name starts with employee:",
      () => permission.permission_name.startsWith("employee:"),
    );
  }
  // 4. Test project category filter
  const projectPermissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: { category: "project" } satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(projectPermissions);
  TestValidator.equals(
    "project category has correct count",
    projectPermissions.data.length,
    2,
  );
  for (const permission of projectPermissions.data) {
    TestValidator.predicate(
      "project permission name starts with project:",
      () => permission.permission_name.startsWith("project:"),
    );
  }
  // 5. Test time category filter
  const timePermissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: { category: "time" } satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(timePermissions);
  TestValidator.equals(
    "time category has correct count",
    timePermissions.data.length,
    3,
  );
  for (const permission of timePermissions.data) {
    TestValidator.predicate("time permission name starts with time:", () =>
      permission.permission_name.startsWith("time:"),
    );
  }
  // 6. Test report category filter
  const reportPermissions = await api.functional.hrm.member.permissions.index(
    memberConnection,
    {
      body: { category: "report" } satisfies IHrmPermission.IRequest,
    },
  );
  typia.assert(reportPermissions);
  TestValidator.equals(
    "report category has correct count",
    reportPermissions.data.length,
    1,
  );
  TestValidator.predicate("report permission name starts with report:", () =>
    reportPermissions.data[0].permission_name.startsWith("report:"),
  );
  // 7. Validate pagination metadata reflects filtered results
  TestValidator.equals(
    "org pagination records match data count",
    orgPermissions.pagination.records,
    orgPermissions.data.length,
  );
  TestValidator.equals(
    "employee pagination records match data count",
    employeePermissions.pagination.records,
    employeePermissions.data.length,
  );
  TestValidator.equals(
    "project pagination records match data count",
    projectPermissions.pagination.records,
    projectPermissions.data.length,
  );
  TestValidator.equals(
    "time pagination records match data count",
    timePermissions.pagination.records,
    timePermissions.data.length,
  );
  TestValidator.equals(
    "report pagination records match data count",
    reportPermissions.pagination.records,
    reportPermissions.data.length,
  );
}
