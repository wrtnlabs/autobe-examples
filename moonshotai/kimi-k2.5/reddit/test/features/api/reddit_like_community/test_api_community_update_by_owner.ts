import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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
 * Test successful community update by the owner.
 * An authenticated member creates a community and then updates its description
 * to reflect new community guidelines. The operation validates that the requesting
 * member is the owner, the community exists and is not soft-deleted, and returns
 * the updated community with the new description while other fields remain
 * unchanged. Verify that the updated_at timestamp is updated and the response
 * contains the complete community object with owner info, subscriber count, and
 * lifecycle timestamps.
 */
export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community using the authenticated member
  const originalCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(originalCommunity);
  // Store original values for comparison
  const originalName = originalCommunity.name;
  const originalDescription = originalCommunity.description;
  const originalUpdatedAt = originalCommunity.updated_at;
  const originalCreatedAt = originalCommunity.created_at;
  const originalOwner = originalCommunity.owner;
  const originalIcon = originalCommunity.icon;
  const originalSubscriberCount = originalCommunity.subscriber_count;
  const originalDeletedAt = originalCommunity.deleted_at;
  // 3. Update the community with new description
  const newDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedCommunity =
    await api.functional.redditLike.member.communities.update(
      memberConnection,
      {
        communityId: originalCommunity.id,
        body: {
          description: newDescription,
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Verify description is updated
  TestValidator.equals(
    "description should be updated",
    updatedCommunity.description,
    newDescription,
  );
  TestValidator.notEquals(
    "description should not be same as original",
    updatedCommunity.description,
    originalDescription,
  );
  // 5. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at should be changed after update",
    updatedCommunity.updated_at,
    originalUpdatedAt,
  );
  // 6. Verify other fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "name should remain unchanged",
    updatedCommunity.name,
    originalName,
  );
  TestValidator.equals(
    "owner should remain unchanged",
    updatedCommunity.owner,
    originalOwner,
  );
  TestValidator.equals(
    "icon should remain unchanged",
    updatedCommunity.icon,
    originalIcon,
  );
  TestValidator.equals(
    "subscriber_count should remain unchanged",
    updatedCommunity.subscriber_count,
    originalSubscriberCount,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedCommunity.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged",
    updatedCommunity.deleted_at,
    originalDeletedAt,
  );
}
