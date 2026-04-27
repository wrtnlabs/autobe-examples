import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_files_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_files_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_file } from "../../../prepare/prepare_random_hrm_time_tracking_organization_file";

export async function test_api_organization_files_list_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  //----
  // PREPARE: Create member, organization, files, and soft-delete one
  //----
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Upload 3 files
  const files = await ArrayUtil.asyncRepeat(3, async () => {
    const file =
      await generate_random_hrm_time_tracking_member_organizations_files_create(
        memberConnection,
        {
          params: {
            organizationId: organization.id,
          },
        },
      );
    typia.assert(file);
    return file;
  });
  // 4. Soft-delete the second file (index 1)
  const deletedFile = files[1];
  await api.functional.hrmTimeTracking.member.organizations.files.erase(
    memberConnection,
    {
      organizationId: organization.id,
      fileId: deletedFile.id,
    },
  );
  //----
  // TEST 1: Default listing - include_deleted NOT set
  //----
  const defaultPage =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {},
      },
    );
  typia.assert(defaultPage);
  // 5. Verify the soft-deleted file is NOT in the data array
  TestValidator.predicate(
    "deleted file excluded by default",
    !defaultPage.data.some((f) => f.id === deletedFile.id),
  );
  // 6. Verify total records count excludes the deleted file (3 - 1 = 2)
  TestValidator.equals(
    "records count excludes deleted file",
    defaultPage.pagination.records,
    2,
  );
  // Verify all returned files have deleted_at: null
  for (const file of defaultPage.data) {
    TestValidator.predicate(
      `file ${file.id} has null deleted_at`,
      file.deleted_at === null,
    );
  }
  //----
  // TEST 2: Listing with include_deleted: true
  //----
  const includeDeletedPage =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          include_deleted: true,
        },
      },
    );
  typia.assert(includeDeletedPage);
  // 7. Verify the soft-deleted file IS now included
  TestValidator.predicate(
    "deleted file included when include_deleted=true",
    includeDeletedPage.data.some((f) => f.id === deletedFile.id),
  );
  // 8. Verify the deleted file's deleted_at is non-null
  const includedDeleted = typia.assert(
    includeDeletedPage.data.find((f) => f.id === deletedFile.id)!,
  );
  TestValidator.predicate(
    "deleted file has non-null deleted_at",
    includedDeleted.deleted_at !== null,
  );
  // 9. Verify all non-deleted files still have deleted_at: null
  for (const file of includeDeletedPage.data) {
    if (file.id !== deletedFile.id) {
      TestValidator.predicate(
        `non-deleted file ${file.id} has null deleted_at`,
        file.deleted_at === null,
      );
    }
  }
  // 10. Verify total records count = 3 when include_deleted is true
  TestValidator.equals(
    "total records increase when include_deleted=true",
    includeDeletedPage.pagination.records,
    3,
  );
  // 11. Verify pagination metadata
  TestValidator.predicate(
    "default pages ≤ include_deleted pages",
    defaultPage.pagination.pages <= includeDeletedPage.pagination.pages,
  );
  TestValidator.predicate(
    "current page is valid",
    includeDeletedPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    includeDeletedPage.pagination.limit > 0,
  );
}
