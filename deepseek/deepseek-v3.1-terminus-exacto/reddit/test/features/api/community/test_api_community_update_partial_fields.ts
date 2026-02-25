import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test partial update functionality where only specific fields are modified.
 * Authenticate as a user, create a community, then update only the community
 * description while leaving the name and icon URL unchanged. Verify that only
 * the description field is updated in the response, while other fields retain
 * their original values. This validates the partial update capability of the endpoint.
 */
export async function test_api_community_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Create a community
  const originalCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(originalCommunity);
  // 3. Perform partial update - only description field
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedCommunity =
    await api.functional.communityPlatform.user.communities.update(
      userConnection,
      {
        communityId: originalCommunity.id,
        body: {
          description: updatedDescription,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Validate partial update results
  TestValidator.equals(
    "community ID remains unchanged",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "name field remains unchanged",
    updatedCommunity.name,
    originalCommunity.name,
  );
  TestValidator.equals(
    "description field is updated",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.equals(
    "icon_url field remains unchanged",
    updatedCommunity.icon_url,
    originalCommunity.icon_url,
  );
  TestValidator.equals(
    "owner remains unchanged",
    updatedCommunity.owner.id,
    originalCommunity.owner.id,
  );
  TestValidator.predicate(
    "created_at timestamp unchanged",
    updatedCommunity.created_at === originalCommunity.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer",
    new Date(updatedCommunity.updated_at) >
      new Date(originalCommunity.updated_at),
  );
}
