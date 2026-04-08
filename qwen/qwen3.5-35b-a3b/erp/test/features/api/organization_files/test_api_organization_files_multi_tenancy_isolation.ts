import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_files_create } from "../../../generate/generate_random_hrm_platform_member_organizations_files_create";
import { prepare_random_hrm_platform_organization_file } from "../../../prepare/prepare_random_hrm_platform_organization_file";

export async function test_api_organization_files_multi_tenancy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A with Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B with Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // Generate organization IDs (organizations are created during member join)
  const orgAId: string = typia.random<string & tags.Format<"uuid">>();
  const orgBId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Upload files to Organization A (auth as Member A)
  const filesInOrgA: IHrmPlatformOrganizationFile.ICreate[] = ArrayUtil.repeat(
    3,
    () => ({
      file_key: `${RandomGenerator.alphaNumeric(16)}_${RandomGenerator.name()}`,
      file_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 5,
      }),
      file_type: RandomGenerator.pick(["image/png", "application/pdf", "logo"]),
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1048576>
      >(),
      storage_type: "s3",
      url: typia.random<(string & tags.Format<"uri">) | null>(),
      status: "active",
    }),
  );
  const uploadedFilesInOrgA: IHrmPlatformOrganizationFile[] = [];
  for (const fileBody of filesInOrgA) {
    const file =
      await api.functional.hrmPlatform.member.organizations.files.create(
        memberAConnection,
        {
          organizationId: orgAId,
          body: fileBody,
        },
      );
    typia.assert(file);
    uploadedFilesInOrgA.push(file);
  }
  // 4. Upload files to Organization B (auth as Member B)
  const filesInOrgB: IHrmPlatformOrganizationFile.ICreate[] = ArrayUtil.repeat(
    3,
    () => ({
      file_key: `${RandomGenerator.alphaNumeric(16)}_${RandomGenerator.name()}`,
      file_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 5,
      }),
      file_type: RandomGenerator.pick(["image/png", "application/pdf", "logo"]),
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1048576>
      >(),
      storage_type: "s3",
      url: typia.random<(string & tags.Format<"uri">) | null>(),
      status: "active",
    }),
  );
  const uploadedFilesInOrgB: IHrmPlatformOrganizationFile[] = [];
  for (const fileBody of filesInOrgB) {
    const file =
      await api.functional.hrmPlatform.member.organizations.files.create(
        memberBConnection,
        {
          organizationId: orgBId,
          body: fileBody,
        },
      );
    typia.assert(file);
    uploadedFilesInOrgB.push(file);
  }
  // 5. Verify Member A can list files from Organization A
  const memberAFilesInOrgA =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberAConnection,
      {
        organizationId: orgAId,
        body: {},
      },
    );
  typia.assert(memberAFilesInOrgA);
  TestValidator.equals(
    "Member A can access Organization A files",
    memberAFilesInOrgA.data.length,
    uploadedFilesInOrgA.length,
  );
  // 6. Verify Member B can list files from Organization B
  const memberBFilesInOrgB =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberBConnection,
      {
        organizationId: orgBId,
        body: {},
      },
    );
  typia.assert(memberBFilesInOrgB);
  TestValidator.equals(
    "Member B can access Organization B files",
    memberBFilesInOrgB.data.length,
    uploadedFilesInOrgB.length,
  );
  // 7. Test Multi-Tenancy Isolation - Member A trying to access Organization B files
  // Expected to fail with 403 Forbidden or 404 Not Found
  await TestValidator.error(
    "Member A cannot access Organization B files (multi-tenancy isolation)",
    async () => {
      await api.functional.hrmPlatform.member.organizations.files.index(
        memberAConnection,
        {
          organizationId: orgBId,
          body: {},
        },
      );
    },
  );
  // 8. Test Multi-Tenancy Isolation - Member B trying to access Organization A files
  await TestValidator.error(
    "Member B cannot access Organization A files (multi-tenancy isolation)",
    async () => {
      await api.functional.hrmPlatform.member.organizations.files.index(
        memberBConnection,
        {
          organizationId: orgAId,
          body: {},
        },
      );
    },
  );
  // 9. Verify no data leakage - files from orgA should not contain orgB references
  for (const file of uploadedFilesInOrgA) {
    TestValidator.equals(
      "File belongs to Organization A",
      file.organization.id,
      orgAId,
    );
  }
  // 10. Verify no data leakage - files from orgB should not contain orgA references
  for (const file of uploadedFilesInOrgB) {
    TestValidator.equals(
      "File belongs to Organization B",
      file.organization.id,
      orgBId,
    );
  }
}
