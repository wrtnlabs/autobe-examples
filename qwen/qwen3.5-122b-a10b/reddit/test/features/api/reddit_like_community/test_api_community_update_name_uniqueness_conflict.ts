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

/**
 * Test community name uniqueness constraint during update operation.
 *
 * Validates that community names must remain unique across the platform when updating an existing community. When a community owner attempts to change their community's name to one that already exists on another community, the system must reject the update with a 409 Conflict error.
 *
 * The test ensures that the uniqueness validation excludes the current community being updated, allowing owners to modify other fields without triggering false conflicts. This validates the proper implementation of the database unique constraint and the business logic for name validation.
 *
 * 1. Register a member account for authentication.
 * 2. Create the first community with a unique name.
 * 3. Create a second community with a different unique name.
 * 4. Attempt to update the first community's name to match the second community's name.
 * 5. Validate that the update fails with a 409 Conflict error.
 * 6. Verify that the first community's name remains unchanged after the failed update.
 */
export async function test_api_community_update_name_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first community
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name(1)}-community-1`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. Create second community with different name
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name(1)}-community-2`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 4. Attempt to update community1's name to match community2's name (should fail)
  await TestValidator.httpError("name uniqueness conflict", 409, async () => {
    await api.functional.redditLike.member.communities.update(
      memberConnection,
      {
        communityId: community1.id,
        body: {
          name: community2.name,
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  });
  // 5. Verify community1's name remains unchanged
  const updatedCommunity1 =
    await api.functional.redditLike.member.communities.update(
      memberConnection,
      {
        communityId: community1.id,
        body: {
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity1);
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity1.name,
    community1.name,
  );
}
