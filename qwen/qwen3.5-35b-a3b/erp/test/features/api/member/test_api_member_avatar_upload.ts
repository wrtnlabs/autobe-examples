import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFileUploadRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUploadRequest";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_avatar_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account and obtain authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Use the authenticated memberConnection for avatar upload
  // memberConnection.headers are already updated by authorize_member_join internally
  // 3. Generate PNG file content as base64-encoded string
  // PNG file signature: 89 50 4E 47 0D 0A 1A 0A
  const pngImage =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const updatedMember = await api.functional.hrms.member.avatar.updateAvatar(
    memberConnection,
    {
      body: {
        file: pngImage as string & tags.ContentMediaType<"image/png">,
        original_filename: "test_avatar.png",
        file_type: "image/png",
      },
    },
  );
  typia.assert(updatedMember);
  // 4. Verify the response contains the updated member profile with avatar_uri
  TestValidator.equals(
    "avatar_uri present and non-null",
    updatedMember.avatar_uri !== null,
    true,
  );
  TestValidator.equals(
    "display_name matches registration",
    updatedMember.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "email matches registration",
    updatedMember.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "member ID matches authentication",
    updatedMember.id,
    memberAuth.id,
  );
  // 5. Verify the member has organization memberships with the new avatar
  TestValidator.equals(
    "organization_memberships array exists",
    Array.isArray(updatedMember.organization_memberships),
    true,
  );
  if (updatedMember.organization_memberships.length > 0) {
    const firstMembership = updatedMember.organization_memberships[0];
    typia.assert(firstMembership);
    TestValidator.equals(
      "member in organization has updated avatar_uri",
      firstMembership.member.avatar_uri,
      updatedMember.avatar_uri,
    );
    TestValidator.equals(
      "member in organization has correct display_name",
      firstMembership.member.display_name,
      updatedMember.display_name,
    );
    // Verify member ID matches
    TestValidator.equals(
      "member ID in organization matches",
      firstMembership.member.id,
      updatedMember.id,
    );
  } else {
    // If no organizations exist, avatar can still be set on member profile
    // This is acceptable - member can have avatar without organizations
  }
  // 6. Verify avatar_uri is a valid URI format
  TestValidator.predicate(
    "avatar_uri is valid URI format",
    updatedMember.avatar_uri !== null &&
      updatedMember.avatar_uri !== undefined &&
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(updatedMember.avatar_uri),
  );
}
