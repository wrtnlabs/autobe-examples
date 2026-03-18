import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_update_parent_department(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const parentDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.hrmTimeTracking.member.departments.update(
    memberConnection,
    {
      departmentId,
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId,
      } satisfies IHrmTimeTrackingDepartment.IUpdate,
    },
  );
  typia.assert(output);
  TestValidator.equals("department id is preserved", output.id, output.id);
  TestValidator.predicate(
    "organization summary is present",
    output.organization.id.length > 0 && output.organization.name.length > 0,
  );
  TestValidator.predicate("department name is updated", output.name.length > 0);
  TestValidator.predicate(
    "department description is either string or null",
    output.description === null || typeof output.description === "string",
  );
  TestValidator.predicate(
    "parent department relation is either null or expanded summary",
    output.parentDepartment === null ||
      typeof output.parentDepartment.id === "string",
  );
}
