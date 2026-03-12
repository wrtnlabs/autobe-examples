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
 * Test that a community owner can successfully update their community's information.
 *
 * This test verifies the community update workflow where:
 * 1. A member registers and authenticates
 * 2. The member creates a community (becoming the owner)
 * 3. The owner updates the community's name and description
 * 4. The response is validated to ensure correct update behavior
 */
export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: undefined,
  });
  // 2. Setup: Create a community as the owner
  const initialCommunity =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(initialCommunity);
  // 3. Test: Prepare update values
  const newName = RandomGenerator.alphabets(10);
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  // 4. Test: Update the community with new name and description
  const updatedCommunity =
    await api.functional.redditClone.member.communities.update(
      ownerConnection,
      {
        communityId: initialCommunity.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IRedditCloneCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Validation: Verify the update was successful
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
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedCommunity.updated_at,
    initialCommunity.created_at,
  );
  TestValidator.equals(
    "owner remains unchanged",
    updatedCommunity.owner.id,
    initialCommunity.owner.id,
  );
  TestValidator.equals(
    "subscriber_count remains unchanged",
    updatedCommunity.subscriber_count,
    initialCommunity.subscriber_count,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedCommunity.created_at,
    initialCommunity.created_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedCommunity.deleted_at,
    null,
  );
}
