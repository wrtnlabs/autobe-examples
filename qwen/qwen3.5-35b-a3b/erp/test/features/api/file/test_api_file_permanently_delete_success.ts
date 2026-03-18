import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_file_permanently_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Update connection with member token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorizedMember.token.access}` },
  };
  // 3. Retrieve organization context
  const organizations = await api.functional.hrms.member.organizations.index(
    memberAuthConnection,
    {
      body: {},
    },
  );
  typia.assert(organizations);
  TestValidator.predicate(
    "has at least one organization",
    organizations.data.length > 0,
  );
  // 4. Generate file ID for deletion test
  const fileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Attempt to retrieve file before deletion (should exist in test environment)
  try {
    const existingFile = await api.functional.hrms.member.files.at(
      memberAuthConnection,
      {
        fileId,
      },
    );
    typia.assert(existingFile);
  } catch {
    // File may not exist in test environment, continue with deletion attempt
    // The deletion API will handle the validation
  }
  // 6. Permanently delete the file
  const deletedFile =
    await api.functional.hrms.member.files.permanently_delete.permanentlyDelete(
      memberAuthConnection,
      { fileId },
    );
  typia.assert(deletedFile);
  // 7. Validate deleted file response contains required fields
  TestValidator.equals("file id matches", deletedFile.id, fileId);
  TestValidator.equals(
    "filename present",
    typeof deletedFile.filename,
    "string",
  );
  TestValidator.equals(
    "storage_path present",
    typeof deletedFile.storage_path,
    "string",
  );
  TestValidator.equals(
    "mime_type present",
    typeof deletedFile.mime_type,
    "string",
  );
  TestValidator.equals(
    "file_category present",
    typeof deletedFile.file_category,
    "string",
  );
  TestValidator.equals(
    "organization_id matches organization",
    deletedFile.organization_id,
    organizations.data[0].id,
  );
  // 8. Verify file no longer exists after deletion
  await TestValidator.httpError(
    "file should be deleted and return 404",
    [404],
    async () => {
      await api.functional.hrms.member.files.at(memberAuthConnection, {
        fileId,
      });
    },
  );
}