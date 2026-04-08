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

/**
 * Test file status transition to archived for compliance retention.
 *
 * Validates the complete workflow for transitioning an organization file from
 * active to archived status. The test creates a member account with an initial
 * organization, uploads a file with 'active' status, then updates the file to
 * 'archived' status. It verifies the status change is correctly persisted, the
 * updated_at timestamp reflects the change time, and all other file metadata
 * remains unchanged during the status transition.
 *
 * Business rules validated:
 * - Status can transition from 'active' to 'archived' for compliance retention
 * - Archived files are preserved for historical reference
 * - All metadata fields (name, type, size, storage, url) remain intact
 * - updated_at timestamp reflects the time of status change
 * - File remains properly associated with its organization
 */
export async function test_api_organization_file_status_archived(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
    },
  });
  typia.assert(joinResult);
  // 2. Create a dedicated organization for file storage
  const orgConnection: api.IConnection = { host: connection.host };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      orgConnection,
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
  const organizationId: string = organization.id;
  // 3. Create a file with 'active' status
  const fileConnection: api.IConnection = { host: connection.host };
  const fileCreateResult =
    await generate_random_hrm_platform_member_organizations_files_create(
      fileConnection,
      {
        params: { organizationId },
        body: {
          status: "active",
        },
      },
    );
  typia.assert(fileCreateResult);
  // Store original values for validation
  const originalFileName: string = fileCreateResult.file_name;
  const originalFileType: string = fileCreateResult.file_type;
  const originalFileSize: number = fileCreateResult.file_size;
  const originalStorageType: string = fileCreateResult.storage_type;
  const originalUrl: (string & tags.Format<"uri">) | null =
    fileCreateResult.url;
  const originalCreatedAt: string & tags.Format<"date-time"> =
    fileCreateResult.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    fileCreateResult.updated_at;
  const originalOrganizationId: string = fileCreateResult.organization.id;
  // 4. Update file status to 'archived'
  const fileId: string = fileCreateResult.id;
  const updateConnection: api.IConnection = { host: connection.host };
  const updatedFile =
    await api.functional.hrmPlatform.member.organizations.files.update(
      updateConnection,
      {
        organizationId,
        fileId,
        body: {
          status: "archived",
        },
      },
    );
  typia.assert(updatedFile);
  // 5. Validate status transition
  TestValidator.equals(
    "status changed to archived",
    updatedFile.status,
    "archived",
  );
  // 6. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalUpdatedAt,
    updatedFile.updated_at,
  );
  // 7. Validate all other metadata fields remain unchanged
  TestValidator.equals(
    "file_name unchanged",
    originalFileName,
    updatedFile.file_name,
  );
  TestValidator.equals(
    "file_type unchanged",
    originalFileType,
    updatedFile.file_type,
  );
  TestValidator.equals(
    "file_size unchanged",
    originalFileSize,
    updatedFile.file_size,
  );
  TestValidator.equals(
    "storage_type unchanged",
    originalStorageType,
    updatedFile.storage_type,
  );
  TestValidator.equals("url unchanged", originalUrl, updatedFile.url);
  TestValidator.equals(
    "created_at unchanged",
    originalCreatedAt,
    updatedFile.created_at,
  );
  // 8. Validate file still belongs to the organization
  TestValidator.equals(
    "organization unchanged",
    originalOrganizationId,
    updatedFile.organization.id,
  );
}
