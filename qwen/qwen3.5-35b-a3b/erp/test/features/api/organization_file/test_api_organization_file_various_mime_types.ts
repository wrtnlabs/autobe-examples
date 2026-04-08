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

export async function test_api_organization_file_various_mime_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Extract organization ID from session
  const organizationId: string & tags.Format<"uuid"> =
    memberAuth.member.id ??
    memberAuth.sessions?.[0]?.organization?.id ??
    "00000000-0000-0000-0000-000000000000";
  // 2. Create files with various MIME types and categories
  const fileTests = [
    {
      file_key: "uploads/logo.jpg",
      file_name: "logo.jpg",
      file_type: "image/jpeg",
    },
    {
      file_key: "uploads/report.docx",
      file_name: "report.docx",
      file_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      file_key: "uploads/company-logo",
      file_name: "company-logo",
      file_type: "logo",
    },
    {
      file_key: "uploads/policy.pdf",
      file_name: "policy.pdf",
      file_type: "document",
    },
    {
      file_key: "uploads/audio.mp3",
      file_name: "audio.mp3",
      file_type: "audio/mpeg",
    },
    {
      file_key: "uploads/demo.mp4",
      file_name: "demo.mp4",
      file_type: "video/mp4",
    },
    {
      file_key: "uploads/readme.txt",
      file_name: "readme.txt",
      file_type: "text/plain",
    },
  ];
  for (const test of fileTests) {
    const file =
      await api.functional.hrmPlatform.member.organizations.files.create(
        memberConnection,
        {
          organizationId,
          body: {
            file_key: test.file_key,
            file_name: test.file_name,
            file_type: test.file_type,
            file_size: typia.random<number & tags.Type<"int32">>(),
            storage_type: "s3",
            url: null,
          } satisfies IHrmPlatformOrganizationFile.ICreate,
        },
      );
    typia.assert(file);
    TestValidator.equals(
      `file_type for ${test.file_key}`,
      file.file_type,
      test.file_type,
    );
  }
  // 3. Validate MIME types are preserved exactly (no normalization)
  const mimeTypeFile =
    await api.functional.hrmPlatform.member.organizations.files.create(
      memberConnection,
      {
        organizationId,
        body: {
          file_key: "uploads/complex.type/subtype",
          file_name: "complex.type",
          file_type: "image/jpeg",
          file_size: typia.random<number & tags.Type<"int32">>(),
          storage_type: "s3",
          url: null,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(mimeTypeFile);
  TestValidator.equals(
    "MIME type preserved",
    mimeTypeFile.file_type,
    "image/jpeg",
  );
  // 4. Validate categories stored as-is
  const logoFile =
    await api.functional.hrmPlatform.member.organizations.files.create(
      memberConnection,
      {
        organizationId,
        body: {
          file_key: "uploads/another-logo",
          file_name: "another-logo",
          file_type: "logo",
          file_size: typia.random<number & tags.Type<"int32">>(),
          storage_type: "s3",
          url: null,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(logoFile);
  TestValidator.equals("category stored as-is", logoFile.file_type, "logo");
  // 5. Validate multiple files with same file_type can coexist
  const sameTypeFile1 =
    await api.functional.hrmPlatform.member.organizations.files.create(
      memberConnection,
      {
        organizationId,
        body: {
          file_key: "uploads/same-type-1.jpg",
          file_name: "same-type-1.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<number & tags.Type<"int32">>(),
          storage_type: "s3",
          url: null,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(sameTypeFile1);
  const sameTypeFile2 =
    await api.functional.hrmPlatform.member.organizations.files.create(
      memberConnection,
      {
        organizationId,
        body: {
          file_key: "uploads/same-type-2.jpg",
          file_name: "same-type-2.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<number & tags.Type<"int32">>(),
          storage_type: "s3",
          url: null,
        } satisfies IHrmPlatformOrganizationFile.ICreate,
      },
    );
  typia.assert(sameTypeFile2);
  TestValidator.notEquals(
    "unique file_keys",
    sameTypeFile1.file_key,
    sameTypeFile2.file_key,
  );
  TestValidator.equals(
    "same file_type allowed",
    sameTypeFile1.file_type,
    sameTypeFile2.file_type,
  );
}