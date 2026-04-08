import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
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

export async function test_api_organization_file_duplicate_key_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 1 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // Extract organization ID from the member response
  const organizationId: string = (member.member as unknown as { organization: { id: string } }).organization.id;
  // 2. Create first file with specific file_key
  const uniqueFileKey = "uploads/docs/report-2024.pdf";
  const firstFile =
    await api.functional.hrmPlatform.member.organizations.files.create(
      memberConnection,
      {
        organizationId,
        body: {
          file_key: uniqueFileKey,
          file_name: "Annual Report.pdf",
          file_type: "application/pdf",
          file_size: 2456789,
          storage_type: "s3",
          url: "https://storage.example.com/uploads/docs/report-2024.pdf",
          status: "active",
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(firstFile);
  // 3. Try to create duplicate file with same file_key (should fail)
  await TestValidator.error("duplicate file_key rejected", async () => {
    await api.functional.hrmPlatform.member.organizations.files.create(
      memberConnection,
      {
        organizationId,
        body: {
          file_key: uniqueFileKey, // Same file_key as first file
          file_name: "Annual Report Duplicate.pdf",
          file_type: "application/pdf",
          file_size: 3000000,
          storage_type: "s3",
          url: "https://storage.example.com/uploads/docs/report-2024-duplicate.pdf",
          status: "active",
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  });
  // 4. Verify original file's metadata matches what was created
  TestValidator.equals(
    "original file_key unchanged",
    firstFile.file_key,
    uniqueFileKey,
  );
  TestValidator.equals(
    "original file_name unchanged",
    firstFile.file_name,
    "Annual Report.pdf",
  );
  TestValidator.equals(
    "original file_size unchanged",
    firstFile.file_size,
    2456789,
  );
  TestValidator.equals(
    "original url unchanged",
    firstFile.url,
    "https://storage.example.com/uploads/docs/report-2024.pdf",
  );
  TestValidator.equals("original status unchanged", firstFile.status, "active");
  TestValidator.predicate(
    "original file has valid id",
    firstFile.id.length > 0,
  );
}