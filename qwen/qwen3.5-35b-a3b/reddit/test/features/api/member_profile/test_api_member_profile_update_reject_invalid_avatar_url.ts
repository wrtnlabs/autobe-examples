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

export async function test_api_member_profile_update_reject_invalid_avatar_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member connection with auth token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 3. Get current profile to compare later
  const currentProfile =
    await api.functional.redditPlatform.member.profile.patch(memberConnection, {
      body: {
        display_name: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IUpdate,
    });
  typia.assert(currentProfile);
  const originalUpdatedAt = currentProfile.updated_at;
  // 4. Attempt profile update with invalid avatar URL (mailto: is valid URI but not HTTP/HTTPS)
  const invalidAvatarUrl = "mailto:test@example.com";
  await TestValidator.error("invalid avatar URL rejected", async () => {
    await api.functional.redditPlatform.member.profile.patch(memberConnection, {
      body: {
        display_name: "John Doe",
        bio: "My bio",
        avatar_url: invalidAvatarUrl,
      } satisfies IRedditPlatformMember.IUpdate,
    });
  });
  // 5. Verify profile unchanged - updated_at should remain the same
  const updatedProfile =
    await api.functional.redditPlatform.member.profile.patch(memberConnection, {
      body: {
        display_name: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IUpdate,
    });
  typia.assert(updatedProfile);
  TestValidator.equals(
    "updated_at unchanged after failed update",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    currentProfile.username,
  );
}
