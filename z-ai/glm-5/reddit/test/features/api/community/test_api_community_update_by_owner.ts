import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate (becomes community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community with initial values
  const initialName = RandomGenerator.alphaNumeric(10);
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialIcon = typia.random<string & tags.Format<"url">>();
  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
          icon: initialIcon,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  // 3. Record initial state
  const originalCreatedAt = createdCommunity.createdAt;
  const originalUpdatedAt = createdCommunity.updatedAt;
  const originalSubscriberCount = createdCommunity.subscriberCount;
  const originalOwnerId = createdCommunity.owner.id;
  // 4. Update the community with new values
  const newName = RandomGenerator.alphaNumeric(12);
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const newIcon = typia.random<string & tags.Format<"url">>();
  const updatedCommunity =
    await api.functional.communityPlatform.member.communities.update(
      ownerConnection,
      {
        communityName: createdCommunity.name,
        body: {
          name: newName,
          description: newDescription,
          icon: newIcon,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Verify the response contains updated fields with correct values
  TestValidator.equals("updated name", updatedCommunity.name, newName);
  TestValidator.equals(
    "updated description",
    updatedCommunity.description,
    newDescription,
  );
  TestValidator.equals("updated icon", updatedCommunity.icon, newIcon);
  // 6. Verify updated_at timestamp has been refreshed
  TestValidator.predicate(
    "updated_at should be later than original",
    new Date(updatedCommunity.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // 7. Verify subscriber_count remains unchanged
  TestValidator.equals(
    "subscriber_count unchanged",
    updatedCommunity.subscriberCount,
    originalSubscriberCount,
  );
  // 8. Verify owner relationship is preserved
  TestValidator.equals(
    "owner preserved",
    updatedCommunity.owner.id,
    originalOwnerId,
  );
  // 9. Verify created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity.createdAt,
    originalCreatedAt,
  );
}
