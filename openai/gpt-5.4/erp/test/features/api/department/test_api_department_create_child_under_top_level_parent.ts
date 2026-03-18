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

export async function test_api_department_create_child_under_top_level_parent(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const parentBody = {
    name: `parent-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const parentDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: parentBody,
      },
    );
  typia.assert(parentDepartment);
  TestValidator.equals(
    "parent department name matches",
    parentDepartment.name,
    parentBody.name,
  );
  TestValidator.equals(
    "parent department description matches",
    parentDepartment.description,
    parentBody.description ?? null,
  );
  TestValidator.equals(
    "parent department has no immediate parent",
    parentDepartment.parent,
    null,
  );
  const childBody = {
    name: `child-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_department_id: parentDepartment.id,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const childDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: childBody,
      },
    );
  typia.assert(childDepartment);
  TestValidator.equals(
    "child department name matches",
    childDepartment.name,
    childBody.name,
  );
  TestValidator.equals(
    "child department description matches",
    childDepartment.description,
    childBody.description ?? null,
  );
  TestValidator.notEquals(
    "child department differs from parent department",
    childDepartment.id,
    parentDepartment.id,
  );
  TestValidator.predicate(
    "child department has immediate parent summary",
    childDepartment.parent !== null,
  );
  TestValidator.equals(
    "child parent id matches created parent",
    childDepartment.parent!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child parent name matches created parent",
    childDepartment.parent!.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "child parent description matches created parent",
    childDepartment.parent!.description,
    parentDepartment.description,
  );
  TestValidator.equals(
    "child organization id matches parent organization",
    childDepartment.organization.id,
    parentDepartment.organization.id,
  );
  TestValidator.equals(
    "child organization name matches parent organization",
    childDepartment.organization.name,
    parentDepartment.organization.name,
  );
  TestValidator.equals(
    "child organization description matches parent organization",
    childDepartment.organization.description,
    parentDepartment.organization.description,
  );
  TestValidator.equals(
    "child organization logo matches parent organization",
    childDepartment.organization.logo_uri,
    parentDepartment.organization.logo_uri,
  );
  TestValidator.equals(
    "child organization currency matches parent organization",
    childDepartment.organization.currency_code,
    parentDepartment.organization.currency_code,
  );
  TestValidator.equals(
    "child organization timezone matches parent organization",
    childDepartment.organization.timezone,
    parentDepartment.organization.timezone,
  );
  TestValidator.equals(
    "child organization fiscal month matches parent organization",
    childDepartment.organization.fiscal_start_month,
    parentDepartment.organization.fiscal_start_month,
  );
}
