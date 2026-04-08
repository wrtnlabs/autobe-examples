import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test department duplicate name rejection within the same organization.
 *
 * Validates that the system enforces unique department names within an organization by rejecting duplicate department creation attempts. This test ensures data integrity and prevents organizational structure conflicts.
 *
 * The test flow authenticates a member, creates an organization, creates an initial department with a specific name, then attempts to create a second department with the identical name. The second attempt must fail with a 409 Conflict error.
 *
 * 1. Member joins the platform with randomized credentials.
 * 2. Member creates an organization as the container for departments.
 * 3. Member creates a department with a specific name within the organization.
 * 4. Member attempts to create another department with the same name.
 * 5. Validates that the duplicate creation is rejected with a conflict error.
 */
export async function test_api_department_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create first department with a specific name
  const departmentName = RandomGenerator.name();
  const firstDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(firstDepartment);
  // 4. Attempt to create second department with same name (should fail)
  await TestValidator.error("duplicate department name rejected", async () => {
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  });
}
