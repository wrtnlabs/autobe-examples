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

export async function test_api_department_get_detail_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const department = await api.functional.hrmTimeTracking.member.departments.at(
    memberConnection,
    {
      departmentId,
    },
  );
  typia.assert(department);
  TestValidator.equals(
    "department id should match request",
    department.id,
    departmentId,
  );
  TestValidator.predicate(
    "organization summary should include a uuid id",
    department.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization summary should include a name",
    department.organization.name.length > 0,
  );
  TestValidator.predicate(
    "department name should not be empty",
    department.name.length > 0,
  );
  TestValidator.predicate(
    "department timestamps should be valid ISO strings",
    !Number.isNaN(new Date(department.created_at).getTime()) &&
      !Number.isNaN(new Date(department.updated_at).getTime()),
  );
  TestValidator.predicate(
    "department deleted timestamp should be nullable",
    department.deleted_at === null ||
      !Number.isNaN(new Date(department.deleted_at).getTime()),
  );
  TestValidator.predicate(
    "parent department should be either null or a compact summary with an id and name",
    department.parentDepartment === null ||
      (department.parentDepartment.id.length > 0 &&
        department.parentDepartment.name.length > 0),
  );
  TestValidator.predicate(
    "child departments should be an array",
    Array.isArray(department.childDepartments),
  );
}
