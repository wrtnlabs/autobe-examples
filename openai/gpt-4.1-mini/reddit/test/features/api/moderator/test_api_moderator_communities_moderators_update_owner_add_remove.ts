import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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

export async function test_api_moderator_communities_moderators_update_owner_add_remove(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      bio: null,
      avatarUrl: null,
    },
  });
  ownerConnection.headers = { Authorization: ownerAuth.token.access };
  typia.assert(ownerAuth);
  // 2. User join and create community by the user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  typia.assert(userAuth);
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // 3. Moderator join as moderator to add/remove
  const modConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_moderator_join(modConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      bio: null,
      avatarUrl: null,
    },
  });
  modConnection.headers = { Authorization: modAuth.token.access };
  typia.assert(modAuth);
  // 4. Owner adds modAuth as moderator (adds moderator role)
  const addModResult =
    await api.functional.communityPlatform.moderator.communities.moderators.updateModerators(
      ownerConnection,
      {
        communityId: community.id,
        body: { communityModeratorId: modAuth.id, role: "moderator" },
      },
    );
  typia.assert(addModResult);
  // Verify the addModResult contains the owner and the new moderator
  TestValidator.predicate(
    "owner role preserved post add",
    addModResult.role === "owner" &&
      addModResult.communityModerator !== undefined &&
      (addModResult.communityModerator as any).moderatorId === ownerAuth.id,
  );
  TestValidator.predicate(
    "new moderator present post add",
    addModResult.role === "moderator" ||
      (addModResult.communityModerator !== undefined &&
        (addModResult.communityModerator as any).moderatorId === modAuth.id),
  );
  // 5. Owner removes modAuth moderator
  const removeModResult =
    await api.functional.communityPlatform.moderator.communities.moderators.updateModerators(
      ownerConnection,
      {
        communityId: community.id,
        body: { communityModeratorId: modAuth.id },
      },
    );
  typia.assert(removeModResult);
  // 6. Verify owner still present and modAuth removed
  TestValidator.predicate(
    "owner role preserved post remove",
    removeModResult.role === "owner" &&
      removeModResult.communityModerator !== undefined &&
      (removeModResult.communityModerator as any).moderatorId === ownerAuth.id,
  );
  TestValidator.predicate(
    "moderator removed",
    removeModResult.communityModerator !== undefined &&
      (removeModResult.communityModerator as any).moderatorId !== modAuth.id,
  );
  // 7. Attempt to remove community owner (expect error or no effect)
  await TestValidator.error("cannot remove community owner", async () => {
    await api.functional.communityPlatform.moderator.communities.moderators.updateModerators(
      ownerConnection,
      {
        communityId: community.id,
        body: { communityModeratorId: ownerAuth.id },
      },
    );
  });
}
