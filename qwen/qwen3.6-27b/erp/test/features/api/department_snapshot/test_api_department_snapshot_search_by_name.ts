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
 * Search department configuration snapshots by snapshot name using text search with case-insensitive partial matching.
 *
 * Validates that department snapshot search correctly filters results by the denormalized department name stored in each snapshot. Creates multiple snapshots by updating the department name several times, then verifies that searching with a partial term returns only snapshots whose names contain that term.
 *
 * The search utilizes GIN trigram indexing for efficient partial string matching. Results are scoped to the authenticated member's organization and include proper pagination metadata.
 *
 * 1. Register a new member account with a random email, password, and display name.
 * 2. Create a department with a distinctive searchable name.
 * 3. Update the department name multiple times to generate multiple configuration snapshots.
 * 4. Search snapshots using a partial term from the department name.
 * 5. Validate that all returned snapshots contain the search term (case-insensitive).
 * 6. Verify pagination metadata reflects the filtered result set.
 */
export async function test_api_department_snapshot_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(),
    href: "",
    referrer: "",
  } satisfies IHrmPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: credentials });
  // 2. Create a department with a distinctive searchable name
  const baseName = "Engineering";
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: `${baseName} Alpha`,
        },
      },
    );
  typia.assert(department);
  // 3. Update department multiple times to generate snapshots
  // Update 1: Change name to "Engineering Beta"
  const update1Body = {
    name: `${baseName} Beta`,
  } satisfies IHrmPlatformDepartment.IUpdate;
  const deptAfterUpdate1 =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: update1Body,
      },
    );
  typia.assert(deptAfterUpdate1);
  // Update 2: Change name to "Engineering Gamma"
  const update2Body = {
    name: `${baseName} Gamma`,
  } satisfies IHrmPlatformDepartment.IUpdate;
  const deptAfterUpdate2 =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: update2Body,
      },
    );
  typia.assert(deptAfterUpdate2);
  // Update 3: Change name to "Engineering Delta"
  const update3Body = {
    name: `${baseName} Delta`,
  } satisfies IHrmPlatformDepartment.IUpdate;
  const deptAfterUpdate3 =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: update3Body,
      },
    );
  typia.assert(deptAfterUpdate3);
  // 4. Search snapshots using partial term from department name
  const searchTerm = "Engineer";
  const searchRequest = {
    search: searchTerm,
    limit: 100,
    page: 1,
  } satisfies IHrmPlatformDepartmentSnapshot.IRequest;
  const snapshots =
    await api.functional.hrmPlatform.member.department_snapshots.index(
      memberConnection,
      { body: searchRequest },
    );
  typia.assert(snapshots);
  // 5. Validate that all returned snapshots contain the search term
  TestValidator.predicate(
    "all snapshots contain search term",
    snapshots.data.every((s) =>
      s.snapshotName.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // 6. Verify pagination metadata reflects filtered result set
  TestValidator.equals("correct page", snapshots.pagination.current, 1);
  TestValidator.predicate(
    "records count matches data array length",
    snapshots.pagination.records >= snapshots.data.length,
  );
  TestValidator.predicate(
    "at least one snapshot returned for valid search term",
    snapshots.data.length > 0,
  );
}
