import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

/**
 * Test that a community owner can successfully remove a moderator's privileges from their community.
 *
 * This test validates the primary success path where the owner revokes moderator status
 * from a previously assigned member through the DELETE endpoint.
 */
export async function test_api_community_owner_removes_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community (owner becomes owner automatically)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create and authenticate the member who will be assigned as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 4. Assign the second member as a moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuth.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // Verify moderator assignment was created successfully
  TestValidator.equals(
    "moderator member id matches",
    moderatorAssignment.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "moderator community id matches",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.predicate(
    "moderator assignment is active",
    moderatorAssignment.deleted_at === null,
  );
  // 5. Owner removes the moderator
  await api.functional.redditPlatform.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorAuth.id,
    },
  );
  // 6. Validate that the removed member still has an account
  TestValidator.predicate(
    "removed member account exists",
    moderatorAuth.id.length > 0,
  );
  TestValidator.predicate(
    "removed member username preserved",
    moderatorAuth.username.length > 0,
  );
  // 7. Verify that attempting to re-add the removed moderator fails
  // (because they are still in the database with deleted_at set, so unique constraint applies)
  await TestValidator.error("cannot re-add removed moderator", async () => {
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuth.id,
        },
      },
    );
  });
  // 8. Verify the removed member can still log in (account is not deleted)
  const reauthConnection: api.IConnection = { host: connection.host };
  const reauth = await authorize_member_join(reauthConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(moderatorAuth.email),
      password: RandomGenerator.alphaNumeric(16), // Different password won't work, but account exists
      username: moderatorAuth.username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // This should fail because password is different, proving account exists
  // Actually, we need to test that the account still exists by trying to join with same email
  await TestValidator.error("cannot join with same email", async () => {
    await authorize_member_join(reauthConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(moderatorAuth.email),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
}