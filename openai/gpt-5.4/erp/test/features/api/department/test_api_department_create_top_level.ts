import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_manager_departments_create } from "../../../generate/generate_random_hrm_time_tracking_manager_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  typia.assert(authorized.token);
  TestValidator.equals("manager remains active", authorized.deleted_at, null);
  const body = {
    name: `Top Level ${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const department =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body,
      },
    );
  typia.assert(department);
  typia.assert(department.organization);
  TestValidator.equals(
    "department name echoes input",
    department.name,
    body.name,
  );
  TestValidator.equals(
    "department description echoes input",
    department.description,
    body.description ?? null,
  );
  TestValidator.equals(
    "top-level department has no parent",
    department.parent,
    null,
  );
  TestValidator.notEquals(
    "department id is newly generated",
    department.id,
    authorized.id,
  );
  TestValidator.predicate(
    "organization summary has a generated id",
    department.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization summary has a name",
    department.organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization summary has a currency code",
    department.organization.currency_code.length > 0,
  );
  TestValidator.predicate(
    "organization summary has a timezone",
    department.organization.timezone.length > 0,
  );
  TestValidator.predicate(
    "department created_at is populated",
    department.created_at.length > 0,
  );
  TestValidator.predicate(
    "department updated_at is populated",
    department.updated_at.length > 0,
  );
  TestValidator.equals("department is active", department.deleted_at, null);
}
