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

export async function test_api_member_avatar_persistence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinedMember);
  // Member starts with null avatar_uri
  TestValidator.equals(
    "initial avatar_uri should be null",
    joinedMember.avatar_uri,
    null,
  );
  // 2. Upload avatar
  const avatarConnection: api.IConnection = { host: connection.host };
  const uploadResponse = await api.functional.hrms.member.avatar.updateAvatar(
    avatarConnection,
    {
      body: typia.random<IHrmsFileUploadRequest>(),
    },
  );
  typia.assert(uploadResponse);
  // 3. Verify avatar_uri is set after upload
  TestValidator.equals(
    "avatar_uri should be set after upload",
    uploadResponse.avatar_uri !== null,
    true,
  );
  const initialAvatarUri = uploadResponse.avatar_uri;
  typia.assertGuard(initialAvatarUri !== null);
  TestValidator.predicate(
    "avatar_uri should be valid URI",
    initialAvatarUri!.startsWith("http") || initialAvatarUri!.startsWith("/"),
  );
  // 4. Logout by creating new connection without token (simulated by not using old token)
  // 5. Login with existing credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const reauthenticatedMember = await authorize_member_login(loginConnection, {
    body: {
      email: joinedMember.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmsMember.ILogin,
  });
  typia.assert(reauthenticatedMember);
  // 6. Verify avatar_uri persists after re-login
  TestValidator.equals(
    "avatar_uri should persist after re-login",
    reauthenticatedMember.avatar_uri,
    initialAvatarUri,
  );
  TestValidator.equals(
    "avatar_uri should not be null after re-login",
    reauthenticatedMember.avatar_uri !== null,
    true,
  );
  TestValidator.predicate(
    "re-authenticated avatar_uri should be valid URI",
    reauthenticatedMember.avatar_uri!.startsWith("http") ||
      reauthenticatedMember.avatar_uri!.startsWith("/"),
  );
}
