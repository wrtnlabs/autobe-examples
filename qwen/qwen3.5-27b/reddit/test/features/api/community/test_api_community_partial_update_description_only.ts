import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a community owner can perform a partial update by changing only the description.
 *
 * This test verifies that:
 * 1. Partial updates work correctly (only provided fields are modified)
 * 2. Name and icon remain unchanged when not included in request
 * 3. updated_at timestamp is refreshed
 * 4. Description can be updated independently
 */
export async function test_api_community_partial_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a community with initial name and short description
  const initialDescription = "Initial community description";
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: initialDescription,
          icon: null,
        },
      },
    );
  typia.assert(community);
  // Store original values for comparison
  const originalName = community.name;
  const originalIcon = community.icon;
  const originalCreatedAt = community.created_at;
  const originalUpdatedAt = community.updated_at;
  // 3. Perform partial update with only description field
  const newDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedCommunity =
    await api.functional.redditClone.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          description: newDescription,
        } satisfies IRedditCloneCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Validate partial update results
  // Name should remain unchanged
  TestValidator.equals("name unchanged", updatedCommunity.name, originalName);
  // Description should be updated
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    newDescription,
  );
  // Icon should remain unchanged (null)
  TestValidator.equals("icon unchanged", updatedCommunity.icon, originalIcon);
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity.created_at,
    originalCreatedAt,
  );
  // updated_at should be refreshed (different from original)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCommunity.updated_at,
    originalUpdatedAt,
  );
  // owner should remain the same
  TestValidator.equals(
    "owner unchanged",
    updatedCommunity.owner.id,
    community.owner.id,
  );
  // subscriber_count should remain unchanged
  TestValidator.equals(
    "subscriber_count unchanged",
    updatedCommunity.subscriber_count,
    community.subscriber_count,
  );
  // deleted_at should remain null (community is active)
  TestValidator.predicate(
    "community is active",
    updatedCommunity.deleted_at === null,
  );
}
