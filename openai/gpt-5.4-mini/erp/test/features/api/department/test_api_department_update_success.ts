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

export async function test_api_department_update_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const nextName = RandomGenerator.name();
  const nextDescription = RandomGenerator.paragraph({ sentences: 2 });
  const response =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId,
        body: {
          name: nextName,
          description: nextDescription,
        } satisfies IHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "department id should be preserved",
    response.id,
    departmentId,
  );
  TestValidator.equals(
    "department name should be updated",
    response.name,
    nextName,
  );
  TestValidator.equals(
    "department description should be updated",
    response.description,
    nextDescription,
  );
  TestValidator.predicate(
    "organization should be present",
    response.organization.id.length > 0 &&
      response.organization.name.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp should be a date-time string",
    response.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created timestamp should be a date-time string",
    response.created_at.length > 0,
  );
  TestValidator.predicate(
    "child departments should be preserved as an array",
    Array.isArray(response.childDepartments),
  );
}
