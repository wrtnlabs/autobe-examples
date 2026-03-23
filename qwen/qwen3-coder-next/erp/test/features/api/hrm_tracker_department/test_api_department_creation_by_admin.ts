import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";

export async function test_api_department_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create parent department (top-level first)
  const parentBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null,
  } satisfies IHrmTrackerDepartment.ICreate;
  const parent = await api.functional.hrmTracker.member.departments.create(
    memberConnection,
    {
      body: parentBody,
    },
  );
  typia.assert(parent);
  // 3. Create child department with parent
  const childBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: parent.id,
  } satisfies IHrmTrackerDepartment.ICreate;
  const child = await api.functional.hrmTracker.member.departments.create(
    memberConnection,
    {
      body: childBody,
    },
  );
  typia.assert(child);
  // 4. Validate child department
  TestValidator.equals("child name matches", child.name, childBody.name);
  TestValidator.equals("child parent id matches", child.parent?.id, parent.id);
  TestValidator.equals(
    "child parent name matches",
    child.parent?.name,
    parent.name,
  );
  TestValidator.equals(
    "child description matches",
    child.description,
    childBody.description,
  );
  TestValidator.predicate(
    "parent children_count is 1",
    parent.children_count === 1,
  );
  TestValidator.predicate(
    "parent created_at is valid",
    Boolean(parent.created_at),
  );
  TestValidator.predicate(
    "parent updated_at is valid",
    Boolean(parent.updated_at),
  );
  TestValidator.equals("parent deleted_at is null", parent.deleted_at, null);
  TestValidator.equals("child deleted_at is null", child.deleted_at, null);
  // 5. Create top-level department without parent
  const standaloneBody = {
    name: RandomGenerator.name(3),
    description: null,
    parent_id: null,
  } satisfies IHrmTrackerDepartment.ICreate;
  const standalone = await api.functional.hrmTracker.member.departments.create(
    memberConnection,
    {
      body: standaloneBody,
    },
  );
  typia.assert(standalone);
  TestValidator.equals(
    "standalone name matches",
    standalone.name,
    standaloneBody.name,
  );
  TestValidator.equals("standalone parent is null", standalone.parent, null);
  TestValidator.equals(
    "standalone description is null",
    standalone.description,
    null,
  );
  TestValidator.equals(
    "standalone deleted_at is null",
    standalone.deleted_at,
    null,
  );
}
