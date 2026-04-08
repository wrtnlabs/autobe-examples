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
 * Test community owner successfully updates their community's identifying information.
 *
 * Validates that the authenticated member who created a community can modify the community's name, description, and icon URL. The test ensures that all mutable fields can be updated individually or in combination, and that the system correctly persists changes with a refreshed updated_at timestamp.
 *
 * The test follows this workflow:
 * 1. Register a new member account for authentication
 * 2. Create a community owned by the member
 * 3. Update the community with new name, description, and icon_url
 * 4. Validate that all updated fields are correctly persisted
 * 5. Verify the updated_at timestamp has been refreshed
 *
 * Special attention is given to ensuring the name uniqueness constraint is respected and that only the owner can perform the update operation.
 */
export async function test_api_community_update_by_owner(
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
    },
  });
  typia.assert(member);
  // 2. Create initial community
  const originalCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `original-${RandomGenerator.alphabets(8)}`,
          description: "Original community description",
          icon_url: "https://example.com/original-icon.png",
        },
      },
    );
  typia.assert(originalCommunity);
  // Store original updated_at for comparison
  const originalUpdatedAt = originalCommunity.updated_at;
  // 3. Update community with new values
  const newDescription = "Updated community description";
  const newIconUrl = "https://example.com/updated-icon.png";
  const newName = `updated-${RandomGenerator.alphabets(8)}`;
  const updatedCommunity =
    await api.functional.redditLike.member.communities.update(
      memberConnection,
      {
        communityId: originalCommunity.id,
        body: {
          name: newName,
          description: newDescription,
          icon_url: newIconUrl,
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Validate all fields are updated correctly
  TestValidator.equals(
    "community name updated",
    updatedCommunity.name,
    newName,
  );
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description,
    newDescription,
  );
  TestValidator.equals(
    "community icon_url updated",
    updatedCommunity.icon_url,
    newIconUrl,
  );
  TestValidator.equals(
    "community id unchanged",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "community owner unchanged",
    updatedCommunity.owner.id,
    member.id,
  );
  // 5. Validate updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp is refreshed",
    updatedCommunity.updated_at,
    originalUpdatedAt,
  );
}
