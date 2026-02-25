import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_avatar_url_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 2. Test with null avatarUrl - should succeed (optional field)
  const nullAvatarMember =
    await api.functional.redditClone.member.users.me.update(memberConnection, {
      body: { avatar_url: null } satisfies IRedditCloneMember.IUpdate,
    });
  typia.assert(nullAvatarMember);
  // 3. Test with valid HTTPS URL - should succeed
  const validHttpsUrl = "https://example.com/avatar.png";
  const updatedMember = await api.functional.redditClone.member.users.me.update(
    memberConnection,
    {
      body: { avatar_url: validHttpsUrl } satisfies IRedditCloneMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  TestValidator.equals(
    "avatar URL matches",
    updatedMember.avatarUrl,
    validHttpsUrl,
  );
  // 4. Verify null avatar URL was set correctly (when avatarUrl was null)
  TestValidator.equals(
    "null avatar URL preserved",
    nullAvatarMember.avatarUrl,
    null,
  );
}
