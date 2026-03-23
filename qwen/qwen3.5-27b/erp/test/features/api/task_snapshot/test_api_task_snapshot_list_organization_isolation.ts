import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_snapshot_list_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test organization-level data isolation for task snapshot access.
   * Verifies that members can only access task snapshots from their own organization,
   * and that empty states are handled correctly with proper pagination metadata.
   */
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // 2. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // 3. Verify members have different IDs
  TestValidator.notEquals("members have different IDs", member1.id, member2.id);
  // 4. Query task snapshots for member1 (should be empty)
  const member1Snapshots =
    await api.functional.hrmPlatform.member.task_snapshots.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(member1Snapshots);
  // 5. Query task snapshots for member2 (should be empty)
  const member2Snapshots =
    await api.functional.hrmPlatform.member.task_snapshots.index(
      member2Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(member2Snapshots);
  // 6. Verify empty state for member1
  TestValidator.equals(
    "member1 has no snapshots",
    member1Snapshots.data.length,
    0,
  );
  TestValidator.equals(
    "member1 pagination current",
    member1Snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "member1 pagination limit",
    member1Snapshots.pagination.limit,
    10,
  );
  TestValidator.equals(
    "member1 pagination records",
    member1Snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "member1 pagination pages",
    member1Snapshots.pagination.pages,
    0,
  );
  // 7. Verify empty state for member2
  TestValidator.equals(
    "member2 has no snapshots",
    member2Snapshots.data.length,
    0,
  );
  TestValidator.equals(
    "member2 pagination current",
    member2Snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "member2 pagination limit",
    member2Snapshots.pagination.limit,
    10,
  );
  TestValidator.equals(
    "member2 pagination records",
    member2Snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "member2 pagination pages",
    member2Snapshots.pagination.pages,
    0,
  );
  // 8. Verify both members see the same empty state (organization isolation working)
  TestValidator.equals(
    "both members see empty results",
    member1Snapshots.data.length,
    member2Snapshots.data.length,
  );
  // 9. Test with different pagination parameters
  const member1SnapshotsPage2 =
    await api.functional.hrmPlatform.member.task_snapshots.index(
      member1Connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(member1SnapshotsPage2);
  TestValidator.equals(
    "member1 page 2 has no snapshots",
    member1SnapshotsPage2.data.length,
    0,
  );
  TestValidator.equals(
    "member1 page 2 pagination current",
    member1SnapshotsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "member1 page 2 pagination limit",
    member1SnapshotsPage2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "member1 page 2 pagination records",
    member1SnapshotsPage2.pagination.records,
    0,
  );
  TestValidator.equals(
    "member1 page 2 pagination pages",
    member1SnapshotsPage2.pagination.pages,
    0,
  );
  // 10. Test with filters (should still be empty)
  const member1FilteredSnapshots =
    await api.functional.hrmPlatform.member.task_snapshots.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "todo",
          priority: "high",
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(member1FilteredSnapshots);
  TestValidator.equals(
    "member1 filtered snapshots is empty",
    member1FilteredSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "member1 filtered pagination records",
    member1FilteredSnapshots.pagination.records,
    0,
  );
}
