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
 * Test that a community owner can successfully update their community's metadata including name and description.
 *
 * 1. Create member account via join authentication using utility function
 * 2. Create initial community using utility function
 * 3. Update community with new name and description
 * 4. Validate response contains updated community with new fields
 * 5. Verify updated_at timestamp changed while immutable fields remain unchanged
 * 6. Ensure community name uniqueness validation excludes current community
 * 7. Verify updated community appears correctly in community listings
 */
export async function test_api_community_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // Connection isolation: Create actor-specific connection, NEVER use base connection directly
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create member account using utility function (PRIORITY: utility > SDK)
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create initial community using utility function (PRIORITY: utility > SDK)
  const initialName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const initialCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(initialCommunity);
  // Store immutable values for later validation
  const initialId = initialCommunity.id;
  const initialOwnerId = initialCommunity.owner.id;
  const initialCreatedAt = initialCommunity.created_at;
  const initialUpdatedAt = initialCommunity.updated_at;
  // 3. Update community with new metadata
  // No utility function exists for this endpoint, using SDK is correct
  const updatedName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCommunity = await api.functional.communityPlatform.member.update(
    memberConnection,
    {
      communityId: initialId,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies ICommunityPlatformCommunity.IUpdate,
    },
  );
  typia.assert(updatedCommunity);
  // 4. Validate updated fields
  TestValidator.equals(
    "community name should be updated",
    updatedCommunity.name,
    updatedName,
  );
  TestValidator.equals(
    "community description should be updated",
    updatedCommunity.description,
    updatedDescription,
  );
  // 5. Validate immutable fields remain unchanged
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedCommunity.id,
    initialId,
  );
  TestValidator.equals(
    "community owner ID should remain unchanged",
    updatedCommunity.owner.id,
    initialOwnerId,
  );
  TestValidator.equals(
    "community created_at should remain unchanged",
    updatedCommunity.created_at,
    initialCreatedAt,
  );
  // 6. Validate updated_at changed (business logic, not type validation)
  TestValidator.notEquals(
    "community updated_at should be newer after update",
    updatedCommunity.updated_at,
    initialUpdatedAt,
  );
  // 7. Test that name uniqueness validation excludes current community
  // This ensures updating with same name (but different description) should succeed
  // No utility function exists for this endpoint, using SDK is correct
  const sameNameUpdate = await api.functional.communityPlatform.member.update(
    memberConnection,
    {
      communityId: initialId,
      body: {
        name: updatedName, // Same name as current
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformCommunity.IUpdate,
    },
  );
  typia.assert(sameNameUpdate);
  TestValidator.equals(
    "updating with same name should succeed",
    sameNameUpdate.name,
    updatedName,
  );
  TestValidator.notEquals(
    "description should be updated even with same name",
    sameNameUpdate.description,
    updatedDescription,
  );
  // Note: Community listings verification would require a GET endpoint
  // which is not provided in the available API functions
}
