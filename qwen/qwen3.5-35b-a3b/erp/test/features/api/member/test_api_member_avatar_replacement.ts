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

export async function test_api_member_avatar_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Upload initial JPEG avatar
  const jpegFile = typia.random<string & tags.ContentMediaType<"image/jpeg">>();
  const jpegUpload = {
    file: jpegFile,
    original_filename: "initial-avatar.jpg",
    file_type: "image/jpeg",
  } satisfies IHrmsFileUploadRequest;
  const afterFirstUpload = await api.functional.hrms.member.avatar.updateAvatar(
    memberConnection,
    { body: jpegUpload },
  );
  typia.assert(afterFirstUpload);
  // 3. Verify avatar_uri exists after first upload
  TestValidator.predicate(
    "avatar_uri present after JPEG upload",
    afterFirstUpload.avatar_uri !== undefined,
  );
  // 4. Upload GIF avatar to replace JPEG
  const gifFile = typia.random<string & tags.ContentMediaType<"image/gif">>();
  const gifUpload = {
    file: gifFile,
    original_filename: "new-avatar.gif",
    file_type: "image/gif",
  } satisfies IHrmsFileUploadRequest;
  const afterSecondUpload =
    await api.functional.hrms.member.avatar.updateAvatar(memberConnection, {
      body: gifUpload,
    });
  typia.assert(afterSecondUpload);
  // 5. Verify new avatar_uri in profile (should be different from first)
  TestValidator.notEquals(
    "avatar changed from JPEG to GIF",
    afterFirstUpload.avatar_uri,
    afterSecondUpload.avatar_uri,
  );
  // 6. Confirm avatar_uri is set after second upload
  TestValidator.predicate(
    "avatar_uri present after GIF upload",
    afterSecondUpload.avatar_uri !== undefined,
  );
  // Note: Old avatar file soft-deletion is handled by backend
  // We verify through business logic that avatar_uri changed
}
