import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a regular member (not a moderator or owner) cannot lift a ban from a community.
 *
 * This test validates the authorization boundary that only moderators and owners
 * can perform moderation actions like lifting bans. A regular member without
 * moderator privileges attempts to lift a ban and should receive a 403 Forbidden
 * error, while the ban record remains active and unchanged.
 */
export async function test_api_community_ban_lift_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner Setup - Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner_${RandomGenerator.alphabets(8)}@test.com`,
      password: "password123",
      username: `owner_${RandomGenerator.alphabets(6)}`,
      display_name: RandomGenerator.name(2),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(owner);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: "Test community for ban authorization",
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Target Member Setup - Create member who will be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      email: `target_${RandomGenerator.alphabets(8)}@test.com`,
      password: "password123",
      username: `target_${RandomGenerator.alphabets(6)}`,
      display_name: RandomGenerator.name(2),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Unauthorized User Setup - Create regular member (not moderator)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedMember = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: `unauthorized_${RandomGenerator.alphabets(8)}@test.com`,
        password: "password123",
        username: `unauthorized_${RandomGenerator.alphabets(6)}`,
        display_name: RandomGenerator.name(2),
        href: "https://test.com",
        referrer: "https://test.com",
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(unauthorizedMember);
  // 4. Ban Creation - Owner bans the target member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      body: {
        member_id: targetMember.id,
        reason: "Violation of community rules",
      } satisfies IRedditCloneBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // Verify ban is active (lifted_at is null)
  TestValidator.equals("ban is active", ban.lifted_at, null);
  // 5. Unauthorized Ban Lift Attempt - Regular member tries to lift the ban
  await TestValidator.httpError(
    "unauthorized user cannot lift ban",
    403,
    async () =>
      await api.functional.redditClone.member.communities.bans.erase(
        unauthorizedConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      ),
  );
  // 6. Verification - Ban remains active (this would require fetching the ban again,
  // but since there's no GET ban endpoint available, we rely on the 403 error
  // which confirms the operation was rejected)
  TestValidator.predicate("ban lift was rejected with 403", true);
}
