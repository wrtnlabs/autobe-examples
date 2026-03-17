import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test the primary success path where a community owner successfully updates community information.
 * First, authenticate as a member and create a community with name, description, and optionally an icon.
 * Then authenticate as an owner and call the update endpoint to change the community name and description.
 * Verify that the response returns the updated community with the new name, description, and updated timestamp.
 * Ensure the update request includes fields like name, description, and optionally icon_attachment_id.
 * Validate that only provided fields are updated and the community retains its original creation metadata.
 * This tests the core community management capability for owners updating communities created by members.
 */
export async function test_api_community_owner_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and create a community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const originalCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(originalCommunity);
  // Step 2: Create owner connection for update operations
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  // Step 3: Prepare update data with new name and description
  // Using typia.random to ensure valid data within constraints
  const updateBody = {
    name: typia.random<string & tags.MinLength<1> & tags.MaxLength<100>>(),
    description: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<2000>
    >(),
  } satisfies IRedditLikeCommunity.IUpdate;
  // Step 4: Update the community
  const updatedCommunity =
    await api.functional.redditLike.owner.communities.update(ownerConnection, {
      communityId: originalCommunity.id,
      body: updateBody,
    });
  typia.assert(updatedCommunity);
  // Step 5: Validate the update
  TestValidator.equals(
    "community ID preserved",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals("name updated", updatedCommunity.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    updateBody.description,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedCommunity.updated_at,
    originalCommunity.updated_at,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedCommunity.created_at,
    originalCommunity.created_at,
  );
  TestValidator.equals(
    "owner preserved",
    updatedCommunity.owner.id,
    originalCommunity.owner.id,
  );
}
