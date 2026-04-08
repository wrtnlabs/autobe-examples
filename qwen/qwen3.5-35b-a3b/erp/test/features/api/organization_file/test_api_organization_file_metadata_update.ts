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

export async function test_api_organization_file_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create initial organization
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_timezone: "UTC",
      org_fiscal_month: 1,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create organization that will own the file record
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...authConnection.headers,
    Authorization: authResponse.token.access,
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          currency: "USD",
          timezone: "UTC",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create file record within organization
  const file =
    await generate_random_hrm_platform_member_organizations_files_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          file_key: typia.random<string>(),
          file_name: "original_document.pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          storage_type: "s3",
          url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(file);
  // 4. Update file metadata
  const updateBody = {
    file_name: "updated_document.docx",
    file_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    status: "archived",
  } satisfies IHrmPlatformOrganizationFile.IUpdate;
  const updatedFile =
    await api.functional.hrmPlatform.member.organizations.files.update(
      memberConnection,
      {
        organizationId: organization.id,
        fileId: file.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFile);
  // 5. Verify updated fields
  TestValidator.equals(
    "file_name updated",
    updatedFile.file_name,
    "updated_document.docx",
  );
  TestValidator.equals(
    "file_type updated",
    updatedFile.file_type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  TestValidator.equals(
    "status updated to archived",
    updatedFile.status,
    "archived",
  );
  // 6. Verify unchanged system fields
  TestValidator.equals("id unchanged", updatedFile.id, file.id);
  TestValidator.equals(
    "organization reference unchanged",
    updatedFile.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedFile.created_at,
    file.created_at,
  );
  // 7. Verify updated_at timestamp exists and is after created_at
  TestValidator.predicate(
    "updated_at timestamp is valid date",
    new Date(updatedFile.updated_at) > new Date(file.created_at),
  );
}
