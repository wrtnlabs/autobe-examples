import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";

/**
 * Test that creating a department with a duplicate name at the same parent level is rejected.
 *
 * Validates that the system enforces name uniqueness for departments within the same organizational hierarchy level. When attempting to create a department with a name that already exists at the same parent level (including root level with no parent), the API should reject the request with a 409 Conflict error.
 *
 * This test ensures that department name collisions are properly detected and prevented, maintaining data integrity in the organizational structure.
 *
 * 1. Register and authenticate as a member
 * 2. Create a department named "Marketing" at root level (no parent)
 * 3. Attempt to create another department with the same name "Marketing" at root level
 * 4. Verify that the duplicate creation attempt throws an error (409 Conflict)
 */
export async function test_api_department_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create first department named "Marketing" at root level
  const firstDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Marketing",
          description: "First marketing department",
          parent_department_id: null,
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(firstDepartment);
  // 3. Attempt to create duplicate department with same name at same level
  await TestValidator.error("duplicate department name rejected", async () => {
    await api.functional.hrmTimeTrack.member.departments.create(
      memberConnection,
      {
        body: {
          name: "Marketing",
          description: "Second marketing department",
          parent_department_id: null,
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  });
}
