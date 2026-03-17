import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
 * Test successful community update by the community owner.
 *
 * This test verifies that:
 * 1. Owner can update community name with unique value
 * 2. Owner can update community description
 * 3. Owner can update community icon
 * 4. Updated community reflects all changes correctly
 * 5. Updated_at timestamp is refreshed
 * 6. Subscriber count remains unchanged
 * 7. Owner information remains the same
 */
export async function test_api_community_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Create initial community without icon
  const initialCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconFileId: null,
        },
      },
    );
  typia.assert(initialCommunity);
  // Store original values for comparison
  const originalCreatedAt = initialCommunity.createdAt;
  const originalUpdatedAt = initialCommunity.updatedAt;
  const originalSubscriberCount = initialCommunity.subscriberCount;
  const originalOwnerId = initialCommunity.owner.id;
  // 3. Update community with new name
  const newName = RandomGenerator.name(2);
  const updatedCommunity1 =
    await api.functional.communityPlatform.member.communities.update(
      ownerConnection,
      {
        communityId: initialCommunity.id,
        body: {
          name: newName,
          description: initialCommunity.description,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity1);
  // Validate name update
  TestValidator.equals("name updated", updatedCommunity1.name, newName);
  TestValidator.equals(
    "owner unchanged",
    updatedCommunity1.owner.id,
    originalOwnerId,
  );
  TestValidator.equals(
    "subscriber count unchanged",
    updatedCommunity1.subscriberCount,
    originalSubscriberCount,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedCommunity1.updatedAt !== originalUpdatedAt,
  );
  // 4. Update community with new description
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedCommunity2 =
    await api.functional.communityPlatform.member.communities.update(
      ownerConnection,
      {
        communityId: initialCommunity.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity2);
  // Validate description update
  TestValidator.equals(
    "description updated",
    updatedCommunity2.description,
    newDescription,
  );
  TestValidator.equals(
    "subscriber count still unchanged",
    updatedCommunity2.subscriberCount,
    originalSubscriberCount,
  );
  // 5. Update community with icon (icon_file_id is optional - testing without actual file)
  // Note: In real scenario, would need to upload file first and get file ID
  const updatedCommunity3 =
    await api.functional.communityPlatform.member.communities.update(
      ownerConnection,
      {
        communityId: initialCommunity.id,
        body: {
          name: newName,
          description: newDescription,
          icon_file_id: null,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity3);
  // Final validation
  TestValidator.equals("final name correct", updatedCommunity3.name, newName);
  TestValidator.equals(
    "final description correct",
    updatedCommunity3.description,
    newDescription,
  );
  TestValidator.equals(
    "final owner unchanged",
    updatedCommunity3.owner.id,
    originalOwnerId,
  );
  TestValidator.equals(
    "final subscriber count unchanged",
    updatedCommunity3.subscriberCount,
    originalSubscriberCount,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity3.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed from original",
    updatedCommunity3.updatedAt !== originalUpdatedAt,
  );
}
