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

export async function test_api_department_detail_child_with_immediate_parent(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const parentInput = {
    name: `parent-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const parent =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: parentInput,
      },
    );
  typia.assert(parent);
  const childInput = {
    name: `child-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_department_id: parent.id,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const child =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: childInput,
      },
    );
  typia.assert(child);
  const detail = await api.functional.hrmTimeTracking.owner.departments.at(
    ownerConnection,
    {
      departmentId: child.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("child department id matches", detail.id, child.id);
  TestValidator.equals(
    "child department name matches",
    detail.name,
    child.name,
  );
  TestValidator.equals(
    "child department description matches",
    detail.description,
    child.description,
  );
  TestValidator.equals(
    "child organization id matches",
    detail.organization.id,
    child.organization.id,
  );
  TestValidator.equals(
    "parent and child organization ids match",
    parent.organization.id,
    detail.organization.id,
  );
  TestValidator.predicate(
    "detail exposes immediate parent",
    detail.parent !== null,
  );
  const immediateParent = typia.assert(detail.parent!);
  TestValidator.equals("parent id matches", immediateParent.id, parent.id);
  TestValidator.equals(
    "parent name matches",
    immediateParent.name,
    parent.name,
  );
  TestValidator.equals(
    "parent description matches",
    immediateParent.description,
    parent.description,
  );
  TestValidator.predicate(
    "parent summary does not expose deeper hierarchy",
    Object.prototype.hasOwnProperty.call(immediateParent, "parent") === false,
  );
}
