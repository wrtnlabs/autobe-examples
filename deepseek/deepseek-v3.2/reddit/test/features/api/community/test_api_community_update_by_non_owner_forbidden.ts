import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test that a non-owner member cannot update a community they don't own.
 * 1. Create first member (owner) and authenticate them
 * 2. Create a community owned by the first member
 * 3. Create second member (non-owner) and authenticate them
 * 4. Attempt to update the community using the second member's connection (should fail with 403)
 * 5. Verify the error is thrown using TestValidator.error
 * 6. Validate that the community's metadata remains unchanged by fetching it
 * 7. Verify that the original owner can still update the community successfully
 */
export async function test_api_community_update_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community owned by the first member
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create and authenticate second member (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(nonOwnerAuth);
  // 4. Attempt to update the community using the second member's connection (should fail with 403)
  const updateData = {
    name: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.IUpdate;
  await TestValidator.error(
    "non-owner member should not be able to update community",
    async () => {
      await api.functional.communityPlatform.member.update(nonOwnerConnection, {
        communityId: community.id,
        body: updateData,
      });
    },
  );
  // 5. Verify community metadata remains unchanged
  // Note: There's no GET endpoint in the provided SDK, so we'll verify by attempting
  // to update with original owner and checking the update succeeds (proving ownership still valid)
  // 6. Verify original owner can still update the community
  const updatedCommunity = await api.functional.communityPlatform.member.update(
    ownerConnection,
    {
      communityId: community.id,
      body: updateData,
    },
  );
  typia.assert(updatedCommunity);
  // Validate the update was successful
  TestValidator.equals(
    "community name should be updated by owner",
    updatedCommunity.name,
    updateData.name,
  );
  TestValidator.equals(
    "community description should be updated by owner",
    updatedCommunity.description,
    updateData.description,
  );
  TestValidator.equals(
    "community owner should remain the same",
    updatedCommunity.owner.id,
    ownerAuth.id,
  );
}
