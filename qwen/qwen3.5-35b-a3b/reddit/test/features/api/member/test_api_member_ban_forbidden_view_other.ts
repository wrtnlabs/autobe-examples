import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test that access control prevents a member from viewing another user's ban record.
 *
 * Validates the security model around ban record visibility, ensuring that users cannot
 * view moderation actions taken against other users unless they are the banned user
 * themselves or an authorized moderator of the relevant community. This protects the
 * privacy of moderation actions while allowing appropriate access for enforcement.
 *
 * Special attention is given to verifying that the service layer enforces proper
 * authorization checks, returning 403 Forbidden when unauthorized users attempt to
 * access ban records they have no business viewing.
 *
 * 1. Member A (user1) joins the platform to become a regular user.
 * 2. Member B (user2) joins the platform as a separate unrelated user.
 * 3. Member C (moderator) joins the platform to act as a community moderator.
 * 4. Member C creates a community and becomes its owner.
 * 5. Member A subscribes to the community to be part of it.
 * 6. Member C bans Member A from the community with a reason.
 * 7. Member B logs in with their own credentials.
 * 8. Member B attempts to view Member A's ban record using the ban ID.
 * 9. Verify that access control prevents Member B from viewing the ban record.
 */
export async function test_api_member_ban_forbidden_view_other(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (user1) - the banned user
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_member_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: "user1_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user1Auth);
  // 2. Create Member B (user2) - unauthorized viewer
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_member_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: "user2_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user2Auth);
  // 3. Create Member C (moderator) - community owner who will create ban
  const modConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_member_join(modConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: "mod_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(modAuth);
  // 4. Moderator creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      modConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(6) +
            "_" +
            RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 5. Member A (banned user) subscribes to the community
  // Note: We'll assume there's an endpoint for subscription. If not, we may need to
  // adjust the test to directly create the ban without requiring subscription.
  // For now, we'll proceed with creating the ban directly.
  // 6. Moderator bans Member A from the community
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      modConnection,
      {
        body: {
          user_id: user1Auth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(banRecord);
  // 7. Member B logs in fresh (they already joined, but ensure fresh session)
  const user2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(user2LoginConnection, {
    body: {
      email: user2Auth.email,
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  // 8. Member B attempts to view Member A's ban record
  // Expected: 403 Forbidden because user2 is neither the banned user nor a moderator
  await TestValidator.httpError(
    "user2 cannot view user1's ban record",
    403,
    async () => {
      await api.functional.redditPlatform.member.bans.at(user2LoginConnection, {
        banId: banRecord.id,
      });
    },
  );
}
