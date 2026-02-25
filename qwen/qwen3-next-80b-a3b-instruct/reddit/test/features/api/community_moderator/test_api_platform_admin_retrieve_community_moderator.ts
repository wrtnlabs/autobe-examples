import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_retrieve_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const joinData = typia.random<IRedditCommunityPlatformAdmin.IJoin>();
  const authAdmin = await authorize_platform_admin_join(adminConnection, {
    body: joinData,
  });
  typia.assert(authAdmin);
  // 2. Retrieve a community moderator by valid UUID
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const moderator =
    await api.functional.redditCommunity.platformAdmin.community_moderators.at(
      adminConnection,
      { communityModeratorId: moderatorId },
    );
  typia.assert(moderator);
  // 3. Validate the response structure
  // Since we cannot create moderators, we validate only that the response matches the IRedditCommunityCommunityModerator schema
  // and contains expected fields (not their values)
  TestValidator.predicate("moderator has id", moderator.id !== undefined);
  TestValidator.predicate("moderator has email", moderator.email !== undefined);
  TestValidator.predicate(
    "moderator has username",
    moderator.username !== undefined,
  );
  TestValidator.predicate(
    "moderator has display_name",
    moderator.display_name !== undefined,
  );
  TestValidator.predicate(
    "moderator has karma_score",
    moderator.karma_score !== undefined,
  );
  TestValidator.predicate(
    "moderator has created_at",
    moderator.created_at !== undefined,
  );
  TestValidator.predicate(
    "moderator has updated_at",
    moderator.updated_at !== undefined,
  );
  TestValidator.predicate(
    "moderator has community_id",
    moderator.community_id !== undefined,
  );
  TestValidator.predicate("moderator has user", moderator.user !== undefined);
  TestValidator.predicate(
    "moderator has community",
    moderator.community !== undefined,
  );
  // 4. Test 404 for non-existent moderator
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent moderator returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.platformAdmin.community_moderators.at(
        adminConnection,
        {
          communityModeratorId: invalidId,
        },
      );
    },
  );
}
