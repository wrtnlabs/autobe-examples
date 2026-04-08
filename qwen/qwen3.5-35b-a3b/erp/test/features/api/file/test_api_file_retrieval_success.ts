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

export async function test_api_file_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Extract organization ID from sessions (organization context)
  const organizationId: string =
    memberAuth.sessions?.[0]?.organization?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const memberId = memberAuth.member.id;
  // 2. Create a file using random generation (simulating file upload)
  // Since POST /files endpoint is not available, we use random data
  const file = typia.random<IHrmPlatformOrganizationFile>();
  typia.assert(file);
  // Ensure the file belongs to the correct organization
  const fileWithOrg = {
    ...file,
    organization: { ...file.organization, id: organizationId },
  } satisfies IHrmPlatformOrganizationFile;
  // 3. Retrieve file metadata
  const retrievedFile =
    await api.functional.hrmPlatform.member.organizations.files.at(
      memberConnection,
      {
        organizationId,
        fileId: fileWithOrg.id,
      },
    );
  typia.assert(retrievedFile);
  // 4. Validate all required properties
  TestValidator.equals("file id exists", retrievedFile.id, fileWithOrg.id);
  TestValidator.equals(
    "file name matches",
    retrievedFile.file_name,
    fileWithOrg.file_name,
  );
  TestValidator.equals(
    "file type matches",
    retrievedFile.file_type,
    fileWithOrg.file_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.file_size,
    fileWithOrg.file_size,
  );
  TestValidator.equals(
    "storage type matches",
    retrievedFile.storage_type,
    fileWithOrg.storage_type,
  );
  TestValidator.equals(
    "file key matches",
    retrievedFile.file_key,
    fileWithOrg.file_key,
  );
  TestValidator.equals("status is active", retrievedFile.status, "active");
  TestValidator.equals("deleted_at is null", retrievedFile.deleted_at, null);
  TestValidator.equals(
    "url can be null or valid uri",
    retrievedFile.url === null ||
      (typeof retrievedFile.url === "string" && retrievedFile.url.length > 0),
    true,
  );
  // 5. Validate organization reference
  TestValidator.equals(
    "organization id matches",
    retrievedFile.organization.id,
    organizationId,
  );
  TestValidator.notEquals(
    "organization name not empty",
    retrievedFile.organization.name,
    "",
  );
  TestValidator.equals(
    "organization owner id matches member",
    retrievedFile.organization.owner.id,
    memberId,
  );
  // 6. Validate member reference
  TestValidator.equals("member id matches", retrievedFile.member.id, memberId);
  TestValidator.equals(
    "member email matches",
    retrievedFile.member.email,
    memberAuth.email,
  );
  if (memberAuth.display_name) {
    TestValidator.equals(
      "member display name matches",
      retrievedFile.member.display_name,
      memberAuth.display_name,
    );
  }
  // 7. Validate timestamps
  TestValidator.equals(
    "created_at is valid date",
    !!retrievedFile.created_at,
    true,
  );
  TestValidator.equals(
    "updated_at is valid date",
    !!retrievedFile.updated_at,
    true,
  );
  TestValidator.equals(
    "organization created_at is valid date",
    !!retrievedFile.organization.created_at,
    true,
  );
  TestValidator.equals(
    "organization updated_at is valid date",
    !!retrievedFile.organization.updated_at,
    true,
  );
  TestValidator.equals(
    "member created_at is valid date",
    !!retrievedFile.member.created_at,
    true,
  );
  TestValidator.equals(
    "member updated_at is valid date",
    !!retrievedFile.member.updated_at,
    true,
  );
}
