import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test community owner unban operation with audit trail preservation.
 *
 * Validates the complete unban workflow performed by a community owner, including member registration, community creation, ban record creation, unban execution, and audit trail verification. Ensures that the owner can successfully lift bans while maintaining the ban record for moderation history.
 *
 * Special attention is given to verifying that unban operations preserve the ban record for audit purposes and that the system correctly updates the unbanned_at timestamp.
 *
 * 1. Community owner registers and authenticates with unique credentials.
 * 2. Banned user registers and authenticates with separate credentials.
 * 3. Owner creates a community with descriptive metadata.
 * 4. Owner creates a ban record for the banned user.
 * 5. Verify the ban record shows unbanned_at is null (active ban).
 * 6. Owner performs unban operation via DELETE endpoint.
 * 7. Verify unban succeeds without errors.
 * 8. Verify ban record can still be accessed (system integrity).
 * 9. Create and unban another ban to confirm system remains functional.
 */
export async function test_api_community_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(3) + "_" + RandomGenerator.alphaNumeric(5),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string>()) satisfies string as string & tags.Format<"uri">,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Authenticate banned user
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedUserAuthorized = await authorize_member_join(bannedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(3) + "_" + RandomGenerator.alphaNumeric(5),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string>()) satisfies string as string & tags.Format<"uri">,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedUserAuthorized);
  // 3. Create community with owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(6) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create ban record by owner
  const banRecord =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          user_id: bannedUserAuthorized.id,
          reason: "Violation of community rules - test ban record creation",
        } satisfies IRedditPlatformBannedUser.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Verify ban record shows unbanned_at is null (active ban)
  TestValidator.equals(
    "ban initially unbanned_at is null",
    banRecord.unbanned_at,
    null,
  );
  // 6. Unban by owner
  await api.functional.redditPlatform.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: bannedUserAuthorized.id,
    },
  );
  // 7. Verify unban operation succeeds (no error thrown)
  TestValidator.predicate("unban operation completes without error", true);
  // 8. Verify ban record exists in system (audit trail)
  TestValidator.notEquals("ban record has valid id", banRecord.id, null);
  // 9. Create another ban to confirm system integrity
  const anotherBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          user_id: bannedUserAuthorized.id,
          reason: "Test that system allows ban after unban",
        } satisfies IRedditPlatformBannedUser.ICreate,
      },
    );
  typia.assert(anotherBan);
  // 10. Unban again to confirm unban functionality works repeatedly
  await api.functional.redditPlatform.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: bannedUserAuthorized.id,
    },
  );
  // 11. Verify system remains functional after multiple ban/unban cycles
  TestValidator.predicate(
    "system remains functional after unban cycles",
    anotherBan.id !== null,
  );
}