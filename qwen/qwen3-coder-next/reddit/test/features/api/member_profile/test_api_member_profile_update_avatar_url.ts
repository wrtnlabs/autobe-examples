import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_avatar_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as a member
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(1),
  } satisfies IRedditPlatformMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(member);
  // 2. Update avatar URL with valid URI
  const avatarUri = "https://example.com/avatar.png";
  const updateInput = {
    avatar_url: avatarUri,
  } satisfies IRedditPlatformMember.IUpdate;
  const updatedMember =
    await api.functional.redditPlatform.members.updateProfile(
      memberConnection,
      {
        body: updateInput,
      },
    );
  typia.assert(updatedMember);
  TestValidator.equals(
    "avatar_url matches input",
    updatedMember.avatar_url,
    avatarUri,
  );
  // 3. Update avatar URL to null to clear it
  const nullUpdateInput = {
    avatar_url: null,
  } satisfies IRedditPlatformMember.IUpdate;
  const clearedMember =
    await api.functional.redditPlatform.members.updateProfile(
      memberConnection,
      {
        body: nullUpdateInput,
      },
    );
  typia.assert(clearedMember);
  TestValidator.equals("avatar_url cleared", clearedMember.avatar_url, null);
}
