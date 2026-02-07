import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorRole";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_role_update_denied_to_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerToken = await authorize_user_join(ownerConnection, {
    body: {
      email: `owner${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  ownerConnection.headers = { Authorization: ownerToken.token.access };
  // 2. Register and authenticate non-owner community member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberToken = await authorize_user_join(memberConnection, {
    body: {
      email: `member${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  memberConnection.headers = { Authorization: memberToken.token.access };
  // 3. Owner creates a community
  const community = await api.functional.redditPlatform.user.communities.create(
    ownerConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Non-owner attempts to update a moderator role
  // This should fail because only community owners can modify moderator roles
  const nonOwnerUpdateAttempt = async () => {
    await api.functional.redditPlatform.moderators.update(memberConnection, {
      body: {
        community_id: (community as IEntity).id,
        user_id: RandomGenerator.alphaNumeric(8),
        role: "moderator" as const,
      } satisfies IRedditPlatformModeratorRole.IUpdate,
    });
  };
  // 5. Verify the operation is forbidden
  await TestValidator.error(
    "non-owner should be forbidden from updating moderator roles",
    nonOwnerUpdateAttempt,
  );
}
