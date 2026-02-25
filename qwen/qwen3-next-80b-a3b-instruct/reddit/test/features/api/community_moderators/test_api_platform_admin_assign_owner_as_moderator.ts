import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_reddit_community_platform_admin_community_moderators_create";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

export async function test_api_platform_admin_assign_owner_as_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin to perform the operation
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  typia.assert(platformAdmin);
  // 2. Create a separate user who will be the community owner
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(communityOwnerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  typia.assert(communityOwner);
  // 3. Generate a random community_id (we assume it exists and is owned by communityOwner)
  // Since no API exists to create or list communities, we use a generated UUID as community_id
  // The backend will assume this community_id has owner = communityOwner.id based on test data
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to assign the community owner as moderator using the platform admin connection
  // This should fail with 400 Bad Request because the user is an owner
  const createBody: IRedditCommunityModerator.ICreate = {
    user_id: communityOwner.id,
    community_id: communityId,
  };
  await TestValidator.error(
    "owner cannot be assigned as moderator",
    async () => {
      await generate_random_reddit_community_platform_admin_community_moderators_create(
        platformAdminConnection,
        { body: createBody },
      );
    },
  );
}
