import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_detail_fetch_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `mod_${RandomGenerator.alphaNumeric(12)}@test.com`,
      username: `mod_${RandomGenerator.alphabets(5)}`,
      displayName: `Mod ${RandomGenerator.name()}`,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: `https://example.com/avatar/${RandomGenerator.alphabets(5)}.png`,
    },
  });
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 2. Setup user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: user.token.access };
  // 3. Create a community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Moderator gets community details
  const fetchedCommunity =
    await api.functional.communityPlatform.moderator.communities.at(
      moderatorConnection,
      { communityId: community.id },
    );
  typia.assert(fetchedCommunity);
  // 5. Validate community details
  TestValidator.equals("community id", fetchedCommunity.id, community.id);
  TestValidator.equals("community name", fetchedCommunity.name, community.name);
  TestValidator.equals(
    "community description",
    fetchedCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "community iconUrl",
    fetchedCommunity.iconUrl,
    community.iconUrl,
  );
  TestValidator.predicate(
    "community timestamps valid",
    Date.parse(fetchedCommunity.createdAt) > 0 &&
      Date.parse(fetchedCommunity.updatedAt) > 0,
  );
  TestValidator.equals("community deletedAt", fetchedCommunity.deletedAt, null);
  // 6. Validate subscriberCount is a boolean as per DTO (likely a bug, but test as-is)
  TestValidator.predicate(
    "community subscriberCount is boolean",
    typeof fetchedCommunity.subscriberCount === "boolean",
  );
  // 7. Validate ownerUser details
  const ownerUser = fetchedCommunity.ownerUser;
  typia.assert(ownerUser);
  TestValidator.predicate(
    "ownerUser has valid uuid",
    /^[0-9a-fA-F-]{36}$/.test(ownerUser.id),
  );
  TestValidator.predicate(
    "ownerUser has non-empty email",
    ownerUser.email.length > 0,
  );
  TestValidator.predicate(
    "ownerUser has non-empty username",
    ownerUser.username.length > 0,
  );
  TestValidator.predicate(
    "ownerUser has non-empty displayName",
    ownerUser.displayName.length > 0,
  );
  TestValidator.predicate(
    "ownerUser karma is integer",
    Number.isInteger(ownerUser.karma),
  );
  TestValidator.predicate(
    "ownerUser has valid timestamps",
    Date.parse(ownerUser.createdAt) > 0 && Date.parse(ownerUser.updatedAt) > 0,
  );
  TestValidator.equals("ownerUser deletedAt", ownerUser.deletedAt, null);
}
