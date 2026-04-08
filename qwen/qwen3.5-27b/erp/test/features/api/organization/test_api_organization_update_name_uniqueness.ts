import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test organization name update with uniqueness constraint validation.
 *
 * Validates that organization name updates are properly constrained by the uniqueness rule across the platform. The test authenticates a member, creates two organizations, successfully updates one organization to a unique name, and then verifies that attempting to update to a duplicate name is rejected with an appropriate error.
 *
 * The organization name must be unique across the entire system to avoid confusion when users belong to multiple organizations. This constraint is enforced at the database level and validated by the API.
 *
 * 1. Authenticate as member using authorize_member_join utility.
 * 2. Create the first organization that will be updated.
 * 3. Create a second organization with a unique name to test name uniqueness constraint.
 * 4. Update the first organization's name to a new unique value - should succeed.
 * 5. Validate the updated organization contains the new name.
 * 6. Attempt to update the first organization's name to match the second organization's name - should fail.
 * 7. Validate that the duplicate name error is properly thrown.
 */
export async function test_api_organization_update_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create the first organization (target for update)
  const firstOrg =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(firstOrg);
  // 3. Create a second organization with a unique name
  const secondOrg =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(secondOrg);
  // 4. Update the first organization's name to a new unique value
  const uniqueNewName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedOrg =
    await api.functional.hrmTimeTrack.member.organizations.update(
      memberConnection,
      {
        organizationId: firstOrg.id,
        body: {
          name: uniqueNewName,
        } satisfies IHrmTimeTrackOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrg);
  // 5. Validate the updated organization contains the new name
  TestValidator.equals(
    "updated organization name",
    updatedOrg.name,
    uniqueNewName,
  );
  // 6. Attempt to update the first organization's name to match the second organization's name
  await TestValidator.error(
    "duplicate organization name rejected",
    async () => {
      await api.functional.hrmTimeTrack.member.organizations.update(
        memberConnection,
        {
          organizationId: firstOrg.id,
          body: {
            name: secondOrg.name,
          } satisfies IHrmTimeTrackOrganization.IUpdate,
        },
      );
    },
  );
}
