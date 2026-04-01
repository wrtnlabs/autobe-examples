import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_update_employee_management_permission_required(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner-${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `member-${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const original = await api.functional.erpHrmTime.member.employees.at(
    ownerConnection,
    { employeeId: owner.id },
  );
  typia.assert(original);
  const updateBody = {
    positionTitle: RandomGenerator.name(),
    employmentType: "contractor",
    status: "active",
  } satisfies IErpHrmTimeEmployee.IUpdate;
  await TestValidator.httpError(
    "member without employee management permission cannot update employee",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.employees.update(
        memberConnection,
        {
          employeeId: owner.id,
          body: updateBody,
        },
      );
    },
  );
  const afterDenied = await api.functional.erpHrmTime.member.employees.at(
    ownerConnection,
    { employeeId: owner.id },
  );
  typia.assert(afterDenied);
  TestValidator.equals(
    "employee record remains unchanged after denied update",
    afterDenied,
    original,
  );
  const updated = await api.functional.erpHrmTime.member.employees.update(
    ownerConnection,
    {
      employeeId: owner.id,
      body: {
        positionTitle: RandomGenerator.name(),
      } satisfies IErpHrmTimeEmployee.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "authorized update should preserve employee identity",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "authorized update should apply requested position title",
    updated.positionTitle,
    updateBody.positionTitle,
  );
}
