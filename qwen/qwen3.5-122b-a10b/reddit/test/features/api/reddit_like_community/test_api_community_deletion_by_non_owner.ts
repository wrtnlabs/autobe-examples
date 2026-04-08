import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_deletion_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a non-owner member cannot delete a community they do not own.
   *
   * Validates the authorization rule that only community owners have deletion authority within their communities. This test ensures that the backend properly enforces ownership-based access control for community deletion operations.
   *
   * The test creates two distinct member accounts, establishes a community with the first member as owner, then attempts deletion using the second member's credentials. The operation must fail with a 403 Forbidden error to confirm proper authorization enforcement.
   *
   * 1. Create first member account who will own the community.
   * 2. Create a community using the first member's authenticated connection.
   * 3. Verify the community was created with correct ownership information.
   * 4. Create second member account who will attempt unauthorized deletion.
   * 5. Verify the two members are distinct accounts.
   * 6. Attempt to delete the community using the second member's connection.
   * 7. Validate that the deletion fails with 403 Forbidden error.
   */
  // 1. Create first member who will own the community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community owned by first member
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Verify community ownership
  TestValidator.equals("community owner matches", community.owner.id, owner.id);
  // 4. Create second member who will attempt unauthorized deletion
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(nonOwner);
  // 5. Verify second member is different from owner
  TestValidator.notEquals("members are different", owner.id, nonOwner.id);
  // 6. Attempt to delete community as non-owner (should fail with 403)
  await TestValidator.httpError(
    "non-owner cannot delete community",
    403,
    async () => {
      await api.functional.redditLike.member.communities.erase(
        nonOwnerConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
