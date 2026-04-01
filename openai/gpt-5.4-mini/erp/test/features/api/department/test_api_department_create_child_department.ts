import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";

export async function test_api_department_create_child_department(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const parentName = RandomGenerator.name();
  const parentDescription = RandomGenerator.paragraph({ sentences: 2 });
  const parentDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: parentName,
          description: parentDescription,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  const childName = `${parentName} Child`;
  const childDescription = RandomGenerator.paragraph({ sentences: 3 });
  const childDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: childName,
          description: childDescription,
          parentDepartmentId: parentDepartment.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  const childParent = childDepartment.parentDepartment;
  TestValidator.predicate("child has parent", childParent !== null);
  if (childParent === null) return;
  TestValidator.equals(
    "child department name",
    childDepartment.name,
    childName,
  );
  TestValidator.equals(
    "child department description",
    childDepartment.description,
    childDescription,
  );
  TestValidator.equals("child parent id", childParent.id, parentDepartment.id);
  TestValidator.equals(
    "same organization",
    childDepartment.organization,
    parentDepartment.organization,
  );
  TestValidator.equals("parent name", childParent.name, parentDepartment.name);
}
