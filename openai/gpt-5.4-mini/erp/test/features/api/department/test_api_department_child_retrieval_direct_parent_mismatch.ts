import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_child_retrieval_direct_parent_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa123456!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const parentDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const childDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedParentDepartmentId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "reject lookup when child is not directly nested under the supplied parent",
    [404, 403],
    async () => {
      await api.functional.erpHrmTime.member.departments.children.at(
        memberConnection,
        {
          departmentId: mismatchedParentDepartmentId,
          childDepartmentId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "reject lookup when the requested direct pair does not exist",
    [404, 403],
    async () => {
      await api.functional.erpHrmTime.member.departments.children.at(
        memberConnection,
        {
          departmentId: parentDepartmentId,
          childDepartmentId,
        },
      );
    },
  );
}
