import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a non-existent avatar returns a 404 Not Found error.
 *
 * This test validates that the avatar retrieval endpoint properly handles
 * requests for avatar IDs that do not exist in the database. The test ensures
 * that the system returns an appropriate 404 error instead of exposing
 * internal details or returning unexpected data.
 *
 * Test Flow:
 * 1. Register a new member account with valid credentials
 * 2. Generate a random UUID that doesn't correspond to any existing avatar
 * 3. Attempt to retrieve the non-existent avatar
 * 4. Verify 404 Not Found error is returned
 */
export async function test_api_member_avatar_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create authenticated connection for the member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Generate a random UUID that doesn't exist in the database
  const nonExistentAvatarId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the non-existent avatar and verify 404 error
  await TestValidator.httpError(
    "non-existent avatar should return 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.avatars.at(memberConnection, {
        avatarId: nonExistentAvatarId,
      });
    },
  );
}
