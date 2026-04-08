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

export async function test_api_organization_file_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberName = RandomGenerator.name();
  const orgName = RandomGenerator.name();
  const orgCurrency = RandomGenerator.pick(["USD", "EUR", "KRW"]);
  const orgDescription = RandomGenerator.paragraph();
  const orgTimezone = RandomGenerator.pick([
    "UTC",
    "Asia/Seoul",
    "America/New_York",
  ]);
  const orgFiscalMonth = RandomGenerator.pick([1, 4, 7, 10]);
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      name: memberName,
      org_name: orgName,
      org_currency: orgCurrency,
      org_description: orgDescription,
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: orgTimezone,
      org_fiscal_month: orgFiscalMonth,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // Note: joinResponse.member is IHrmPlatformMember.ISummary which doesn't include organization
  // We'll use the org_name from input to verify organization context in file creation
  // 2. Create file with organization context
  const createConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(createConnection, {
    body: {
      email,
      password,
    },
  });
  const fileKey = `uploads/docs/report-${typia.random<string & tags.Format<"uuid">>().replace(/-/g, "").substring(0, 8)}.pdf`;
  const fileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000>
  >();
  const createdFile =
    await api.functional.hrmPlatform.member.organizations.files.create(
      createConnection,
      {
        organizationId: joinResponse.id,
        body: {
          file_key: fileKey,
          file_name: "Annual Report 2024.pdf",
          file_type: "application/pdf",
          file_size: fileSize,
          storage_type: "s3",
          url: typia.random<string & tags.Format<"uri">>(),
          status: "active",
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(createdFile);
  // 3. Validate response
  TestValidator.equals("file key matches input", createdFile.file_key, fileKey);
  TestValidator.equals(
    "file name matches input",
    createdFile.file_name,
    "Annual Report 2024.pdf",
  );
  TestValidator.equals(
    "file type matches input",
    createdFile.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "file size matches input",
    createdFile.file_size,
    fileSize,
  );
  TestValidator.equals(
    "storage type matches input",
    createdFile.storage_type,
    "s3",
  );
  TestValidator.equals("status matches input", createdFile.status, "active");
  // Validate organization reference
  TestValidator.equals(
    "organization name matches created org",
    createdFile.organization.name,
    orgName,
  );
  TestValidator.equals(
    "organization currency matches created org",
    createdFile.organization.currency,
    orgCurrency,
  );
  // Validate member reference
  TestValidator.equals(
    "member ID matches authenticated member",
    createdFile.member.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    createdFile.member.email,
    joinResponse.email,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is set to current time",
    () => new Date(createdFile.created_at) > new Date(Date.now() - 60 * 1000),
  );
  TestValidator.predicate(
    "updated_at is set to current time",
    () => new Date(createdFile.updated_at) > new Date(Date.now() - 60 * 1000),
  );
  TestValidator.equals(
    "deleted_at is NULL for active file",
    createdFile.deleted_at,
    null,
  );
  // Validate UUID format
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  TestValidator.predicate(
    "file ID is valid UUID format",
    uuidPattern.test(createdFile.id),
  );
  TestValidator.predicate(
    "organization ID is valid UUID format",
    uuidPattern.test(createdFile.organization.id),
  );
  TestValidator.predicate(
    "member ID is valid UUID format",
    uuidPattern.test(createdFile.member.id),
  );
}
