import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test community deletion authorization failure for non-owner members.
 *
 * This test validates that only the community owner can delete a community.
 * The test creates two separate member accounts: an owner who creates the
 * community, and a non-owner who attempts to delete it. The non-owner's
 * deletion attempt should fail with a 403 Forbidden error.
 *
 * Test Flow:
 * 1. Create owner member account and authenticate
 * 2. Create a community as the owner
 * 3. Create a different member account (non-owner) and authenticate
 * 4. Attempt to delete the community using non-owner's connection
 * 5. Verify the operation fails with 403 Forbidden error
 */
export async function test_api_community_deletion_non_owner_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community as the owner
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.MaxLength<80000>>(),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Validate community owner is the authenticated member
  TestValidator.equals(
    "community owner should be the creator",
    community.owner.id,
    ownerAuth.id,
  );
  // 3. Create and authenticate as a different member (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(nonOwnerAuth);
  // Ensure non-owner is a different user
  TestValidator.notEquals(
    "non-owner should be different from owner",
    nonOwnerAuth.id,
    ownerAuth.id,
  );
  // 4. Attempt to delete the community as non-owner (should fail with 403)
  await TestValidator.httpError(
    "non-owner deletion should be forbidden",
    403,
    async () => {
      await api.functional.redditClone.communities.erase(nonOwnerConnection, {
        communityId: community.id,
      });
    },
  );
}