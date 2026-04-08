import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_roles_create } from "../../../generate/generate_random_hrm_time_track_member_roles_create";
import { prepare_random_hrm_time_track_role } from "../../../prepare/prepare_random_hrm_time_track_role";

/**
 * Test creating a custom role without providing the optional description field.
 *
 * Validates that the role creation endpoint correctly handles the optional description parameter by creating a role without a description and verifying that the description field is null in the response. This test ensures the nullable description field works as expected in the API contract.
 *
 * The test authenticates a member, creates a role with only the required name and permissions fields (omitting description), and verifies the response structure and null description value.
 *
 * 1. Authenticate as a member using the authorize_member_join utility.
 * 2. Create a role with name and permissions, omitting the optional description field.
 * 3. Validate the response structure and verify description is null.
 * 4. Verify other role properties (is_builtin, permissions) are correctly set.
 */
export async function test_api_role_creation_without_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create role without description
  const role = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Intern",
        permissions: ["project_viewing", "time_management"],
      },
    },
  );
  typia.assert(role);
  // 3. Validate business logic
  TestValidator.equals("role name matches input", role.name, "Intern");
  TestValidator.equals("description is null", role.description, null);
  TestValidator.predicate("is not builtin", role.is_builtin === false);
  TestValidator.equals("permissions match input", role.permissions, [
    "project_viewing",
    "time_management",
  ]);
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
}
