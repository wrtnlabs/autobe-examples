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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_files_create } from "../../../generate/generate_random_hrm_platform_member_organizations_files_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_organization_file } from "../../../prepare/prepare_random_hrm_platform_organization_file";

export async function test_api_organization_file_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization using member connection (headers updated by authorize_member_join)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
          timezone: RandomGenerator.pick([
            "UTC",
            "Asia/Seoul",
            "America/New_York",
          ]),
          fiscal_start_month: RandomGenerator.pick([1, 4, 7, 10]),
        },
      },
    );
  typia.assert(organization);
  // 3. Create file record with initial values
  const fileId = typia.random<string & tags.Format<"uuid">>();
  const originalFileName = "original_document.pdf";
  const originalFileType = "application/pdf";
  const originalFileSize = 1048576;
  const originalStorageType = "s3";
  const originalStatus = "active";
  const initialFile =
    await api.functional.hrmPlatform.member.organizations.files.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          file_key: `files/${fileId}/${originalFileName}`,
          file_name: originalFileName,
          file_type: originalFileType,
          file_size: originalFileSize,
          storage_type: originalStorageType,
          url: null,
          status: originalStatus,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(initialFile);
  const createdAt = initialFile.created_at;
  const createdUpdatedAt = initialFile.updated_at;
  // 4. Perform partial update - only update file_name
  const updatedFileName = "updated_document.pdf";
  const updatedFile =
    await api.functional.hrmPlatform.member.organizations.files.update(
      memberConnection,
      {
        organizationId: organization.id,
        fileId: initialFile.id,
        body: {
          file_name: updatedFileName,
        } satisfies IHrmPlatformOrganizationFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // 5. Validate updated field
  TestValidator.equals(
    "file_name updated",
    updatedFile.file_name,
    updatedFileName,
  );
  // 6. Validate unmodified fields retain original values
  TestValidator.equals(
    "file_type unchanged",
    updatedFile.file_type,
    originalFileType,
  );
  TestValidator.equals(
    "file_size unchanged",
    updatedFile.file_size,
    originalFileSize,
  );
  TestValidator.equals(
    "storage_type unchanged",
    updatedFile.storage_type,
    originalStorageType,
  );
  TestValidator.equals("status unchanged", updatedFile.status, originalStatus);
  // 7. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    createdUpdatedAt,
    updatedFile.updated_at,
  );
  TestValidator.predicate(
    "updated_at is recent",
    () => new Date(updatedFile.updated_at) >= new Date(createdAt),
  );
  // 8. Validate system-managed fields unchanged
  TestValidator.equals("id unchanged", updatedFile.id, initialFile.id);
  TestValidator.equals(
    "organization unchanged",
    updatedFile.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "member unchanged",
    updatedFile.member.id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    createdAt,
    updatedFile.created_at,
  );
}
