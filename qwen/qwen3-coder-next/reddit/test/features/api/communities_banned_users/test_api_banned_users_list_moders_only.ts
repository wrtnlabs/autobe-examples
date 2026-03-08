import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_banned_users_list_moders_only(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community name for testing
  const communityName = "test_community_" + RandomGenerator.alphaNumeric(8);
  // Register two moderators for the community
  const mod1Connection: api.IConnection = { host: connection.host };
  const mod1 = await api.functional.redditLike.auth.moderator.join(
    mod1Connection,
    {
      body: {
        email: "mod1_" + RandomGenerator.alphaNumeric(6) + "@test.com",
        username: "moderator1_" + RandomGenerator.alphaNumeric(4),
        display_name: "Moderator One",
        password: RandomGenerator.alphaNumeric(12),
        bio: null,
        href: "https://example.com",
        referrer: "https://example.com/ref",
        avatar_url: null,
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(mod1);
  const mod2Connection: api.IConnection = { host: connection.host };
  const mod2 = await api.functional.redditLike.auth.moderator.join(
    mod2Connection,
    {
      body: {
        email: "mod2_" + RandomGenerator.alphaNumeric(6) + "@test.com",
        username: "moderator2_" + RandomGenerator.alphaNumeric(4),
        display_name: "Moderator Two",
        password: RandomGenerator.alphaNumeric(12),
        bio: null,
        href: "https://example.com",
        referrer: "https://example.com/ref",
        avatar_url: null,
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(mod2);
  // Test 1: Moderator 1 can retrieve banned users list
  const bannedUsers1 =
    await api.functional.redditLike.communities.banned_users.list(
      mod1Connection,
      { communityName: communityName },
    );
  typia.assert(bannedUsers1);
  // Test 2: Moderator 2 can retrieve banned users list
  const bannedUsers2 =
    await api.functional.redditLike.communities.banned_users.list(
      mod2Connection,
      { communityName: communityName },
    );
  typia.assert(bannedUsers2);
  // Test 3: Unauthorized user should fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user should not access banned users list",
    async () => {
      await api.functional.redditLike.communities.banned_users.list(
        unauthorizedConnection,
        { communityName: communityName },
      );
    },
  );
  // Verify banned users list structure
  typia.assert<IRedditLikeMember.ISummary>(bannedUsers1);
  typia.assert<IRedditLikeMember.ISummary>(bannedUsers2);
  // Test with non-existent community name (should return empty or handle gracefully)
  const nonExistentCommunityName =
    "non_existent_" + RandomGenerator.alphaNumeric(8);
  const emptyBannedUsers =
    await api.functional.redditLike.communities.banned_users.list(connection, {
      communityName: nonExistentCommunityName,
    });
  typia.assert(emptyBannedUsers);
}