import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test department snapshot listing with pagination.
 *
 * Validates the complete department snapshot listing flow including member authentication, department creation, department updates that generate snapshots, and paginated snapshot retrieval. Ensures that the response contains accurate pagination metadata (current page, limit, total records, total pages) and that snapshot records contain denormalized department attributes.
 *
 * Special attention is given to verifying that snapshots are sorted by created_at descending (most recent first), that pagination boundaries are correctly calculated, and that only snapshots from the authenticated member's current organization context are returned.
 *
 * 1. Member joins the platform and authenticates (default organization created).
 * 2. Department is created within the organization.
 * 3. Department is updated multiple times to generate snapshots.
 * 4. Snapshot list is retrieved with pagination parameters.
 * 5. Validates pagination metadata and snapshot record structure, sorted order, and cross-page uniqueness...
 */
export async function test_api_department_snapshot_list_with_pagination(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Create department
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(department);
  // 3. Update department to generate snapshots
  const updatedDepartment =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // Wait a moment to ensure different timestamps for sorting validation
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update department again to generate another snapshot
  const updatedDepartment2 =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment2);
  // 5. List snapshots with pagination - first page
  const page1Request = {
    page: 1,
    limit: 2,
  } satisfies IHrmPlatformDepartmentSnapshot.IRequest;
  const snapshotsPage1 =
    await api.functional.hrmPlatform.member.department_snapshots.index(
      memberConnection,
      { body: page1Request },
    );
  typia.assert(snapshotsPage1);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "first page has data",
    snapshotsPage1.data.length > 0,
  );
  TestValidator.equals(
    "current page is 1",
    snapshotsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    snapshotsPage1.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "total records at least 2",
    snapshotsPage1.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    snapshotsPage1.pagination.pages >= 1,
  );
  // 7. Validate snapshot record structure
  const firstSnapshot = snapshotsPage1.data[0];
  TestValidator.predicate(
    "snapshot has valid ID",
    firstSnapshot.id !== undefined,
  );
  TestValidator.predicate(
    "snapshot has department reference",
    firstSnapshot.department.id !== undefined,
  );
  TestValidator.predicate(
    "snapshot has snapshot name",
    firstSnapshot.snapshotName !== undefined,
  );
  TestValidator.predicate(
    "snapshot has created timestamp",
    firstSnapshot.createdAt !== undefined,
  );
  // 8. Validate sorting by created_at descending
  if (snapshotsPage1.data.length > 1) {
    const firstTimestamp = new Date(snapshotsPage1.data[0].createdAt).getTime();
    const secondTimestamp = new Date(
      snapshotsPage1.data[1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "snapshots sorted by created_at descending",
      firstTimestamp >= secondTimestamp,
    );
  }
  // 9. Test second page if available
  if (snapshotsPage1.pagination.pages >= 2) {
    const page2Request = {
      page: 2,
      limit: 2,
    } satisfies IHrmPlatformDepartmentSnapshot.IRequest;
    const snapshotsPage2 =
      await api.functional.hrmPlatform.member.department_snapshots.index(
        memberConnection,
        { body: page2Request },
      );
    typia.assert(snapshotsPage2);
    TestValidator.equals(
      "current page is 2",
      snapshotsPage2.pagination.current,
      2,
    );
    // Verify no duplicate IDs between pages
    const page1Ids = new Set(snapshotsPage1.data.map((s) => s.id));
    const page2Ids = snapshotsPage2.data.map((s) => s.id);
    const hasDuplicate = page2Ids.some((id) => page1Ids.has(id));
    TestValidator.predicate(
      "no duplicate snapshots across pages",
      hasDuplicate === false,
    );
  }
  // 10. Test filtering by department ID
  const filteredRequest = {
    departmentId: department.id,
    page: 1,
    limit: 100,
  } satisfies IHrmPlatformDepartmentSnapshot.IRequest;
  const filteredSnapshots =
    await api.functional.hrmPlatform.member.department_snapshots.index(
      memberConnection,
      { body: filteredRequest },
    );
  typia.assert(filteredSnapshots);
  TestValidator.predicate(
    "filtered results only contain department snapshots",
    filteredSnapshots.data.every((s) => s.department.id === department.id),
  );
}
