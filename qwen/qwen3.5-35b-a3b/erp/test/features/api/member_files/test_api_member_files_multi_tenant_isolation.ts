import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test multi-tenancy isolation for member file access.
 *
 * Validates that files are correctly scoped to the authenticated member's
 * active organization context. When a member has membership in multiple
 * organizations, they should only see files from the currently active
 * organization.
 */
export async function test_api_member_files_multi_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (will have pre-existing multi-org memberships)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: typia.random<IHrmsMember.IJoin>(),
  });
  typia.assert(member);
  // 2. Verify member has multi-org membership
  TestValidator.predicate(
    "member has at least 2 organization memberships",
    () => member.organization_memberships.length >= 2,
  );
  const org1 = member.organization_memberships[0].organization;
  const org2 = member.organization_memberships[1].organization;
  typia.assert(org1);
  typia.assert(org2);
  TestValidator.notEquals("org1 and org2 are different", org1.id, org2.id);
  // 3. Get files in org1 context (current active org)
  const filesOrg1 = await api.functional.hrms.member.files.index(
    memberConnection,
    {
      body: typia.random<IHrmsFile.IRequest>(),
    },
  );
  typia.assert(filesOrg1);
  typia.assert(filesOrg1.data);
  // Validate all files belong to org1
  for (const file of filesOrg1.data) {
    typia.assert(file.organization);
    TestValidator.equals(
      `org1 file ${file.id} belongs to org1`,
      file.organization.id,
      org1.id,
    );
  }
  // Store org1 file IDs for comparison
  const org1FileIds = new Set(filesOrg1.data.map((f) => f.id));
  // 4. Switch to org2
  const switchedOrg =
    await api.functional.hrms.member.organizations._switch.switchOrganization(
      memberConnection,
      {
        body: {
          search: org2.name,
        },
      },
    );
  typia.assert(switchedOrg);
  TestValidator.equals("switched to org2", switchedOrg.id, org2.id);
  // 5. Get files in org2 context
  const filesOrg2 = await api.functional.hrms.member.files.index(
    memberConnection,
    {
      body: typia.random<IHrmsFile.IRequest>(),
    },
  );
  typia.assert(filesOrg2);
  typia.assert(filesOrg2.data);
  // Validate all files belong to org2
  for (const file of filesOrg2.data) {
    typia.assert(file.organization);
    TestValidator.equals(
      `org2 file ${file.id} belongs to org2`,
      file.organization.id,
      org2.id,
    );
  }
  // Store org2 file IDs for comparison
  const org2FileIds = new Set(filesOrg2.data.map((f) => f.id));
  // 6. Validate no file ID overlap between orgs
  const overlappingFileIds = filesOrg1.data.filter((f1) =>
    filesOrg2.data.some((f2) => f1.id === f2.id),
  );
  TestValidator.equals(
    "no overlapping files between org1 and org2",
    overlappingFileIds.length,
    0,
  );
  // 7. Validate pagination metadata only reflects current org's data
  if (filesOrg1.data.length > 0) {
    TestValidator.predicate(
      "org1 pagination reflects org1 data",
      () => filesOrg1.pagination.records > 0,
    );
  }
  if (filesOrg2.data.length > 0) {
    TestValidator.predicate(
      "org2 pagination reflects org2 data",
      () => filesOrg2.pagination.records > 0,
    );
  }
  // 8. Optional: switch back to org1 and verify isolation
  const backToOrg1 =
    await api.functional.hrms.member.organizations._switch.switchOrganization(
      memberConnection,
      {
        body: {
          search: org1.name,
        },
      },
    );
  typia.assert(backToOrg1);
  TestValidator.equals("switched back to org1", backToOrg1.id, org1.id);
  const filesOrg1Again = await api.functional.hrms.member.files.index(
    memberConnection,
    {
      body: typia.random<IHrmsFile.IRequest>(),
    },
  );
  typia.assert(filesOrg1Again);
  typia.assert(filesOrg1Again.data);
  // Validate we got org1 files again
  for (const file of filesOrg1Again.data) {
    typia.assert(file.organization);
    TestValidator.equals(
      `org1 again file ${file.id} belongs to org1`,
      file.organization.id,
      org1.id,
    );
  }
}
