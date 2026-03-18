import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_departments_create } from "../../../generate/generate_random_hrm_time_tracking_owner_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_create_child_under_top_level_parent(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const topLevelBody = {
    name: `top-level-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const topLevel =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: topLevelBody,
      },
    );
  typia.assert(topLevel);
  TestValidator.equals(
    "top-level department name matches",
    topLevel.name,
    topLevelBody.name,
  );
  TestValidator.equals(
    "top-level department description matches",
    topLevel.description,
    topLevelBody.description ?? null,
  );
  TestValidator.equals(
    "top-level department has no parent",
    topLevel.parent,
    null,
  );
  const childBody = {
    name: `child-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_department_id: topLevel.id,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const child =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: childBody,
      },
    );
  typia.assert(child);
  TestValidator.notEquals(
    "child department id differs from parent",
    child.id,
    topLevel.id,
  );
  TestValidator.equals(
    "child department name matches",
    child.name,
    childBody.name,
  );
  TestValidator.equals(
    "child department description matches",
    child.description,
    childBody.description ?? null,
  );
  TestValidator.predicate(
    "child department has immediate parent",
    child.parent !== null,
  );
  const childParent = typia.assert(child.parent!);
  TestValidator.equals(
    "child parent id matches top-level department",
    childParent.id,
    topLevel.id,
  );
  TestValidator.equals(
    "child parent name matches top-level department",
    childParent.name,
    topLevel.name,
  );
  TestValidator.equals(
    "child parent description matches top-level department",
    childParent.description,
    topLevel.description,
  );
  TestValidator.equals(
    "child organization id matches top-level organization",
    child.organization.id,
    topLevel.organization.id,
  );
  TestValidator.equals(
    "child organization name matches top-level organization",
    child.organization.name,
    topLevel.organization.name,
  );
  TestValidator.equals(
    "child organization description matches top-level organization",
    child.organization.description,
    topLevel.organization.description,
  );
  TestValidator.equals(
    "child organization logo uri matches top-level organization",
    child.organization.logo_uri,
    topLevel.organization.logo_uri,
  );
  TestValidator.equals(
    "child organization currency matches top-level organization",
    child.organization.currency_code,
    topLevel.organization.currency_code,
  );
  TestValidator.equals(
    "child organization timezone matches top-level organization",
    child.organization.timezone,
    topLevel.organization.timezone,
  );
  TestValidator.equals(
    "child organization fiscal start month matches top-level organization",
    child.organization.fiscal_start_month,
    topLevel.organization.fiscal_start_month,
  );
}
