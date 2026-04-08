import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog deletion with time:manage permission override.
 *
 * Validates that a member with time:manage permission can delete timelogs. This test verifies the administrative override capability for time management, confirming that permission-based access control allows authorized users to remove timelog entries.
 *
 * The test demonstrates the core deletion workflow where a member with appropriate permissions can successfully delete timelog records. This is essential for administrative time management operations where managers need to correct or remove erroneous time entries.
 *
 * 1. Member account is created with join operation (receives time:manage permission as organization owner).
 * 2. A timelog entry is created for testing deletion.
 * 3. DELETE /hrmPlatform/member/timelogs/{timelogId} is called with the timelog ID.
 * 4. Validates the deletion succeeds (204 No Content response).
 * 5. Confirms permission-based deletion works correctly.
 */
export async function test_api_timelog_deletion_by_time_manage_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with time:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a timelog entry
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {},
  );
  typia.assert(timelog);
  // 3. Delete the timelog using time:manage permission
  // This validates that members with time:manage permission can delete timelogs
  await api.functional.hrmPlatform.member.timelogs.erase(memberConnection, {
    timelogId: timelog.id,
  });
  // 4. Verify deletion succeeded
  // The erase() function returns void on success (204 No Content)
  // Successful completion without throwing confirms the deletion operation worked
}
