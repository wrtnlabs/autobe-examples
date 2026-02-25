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

export async function test_api_platform_admin_assign_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  // Generate valid UUIDs for user and community (since no creation endpoints are provided)
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Assign the user as moderator of the community
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: platformAdmin.token.access };
  const moderatorAssignment: IRedditCommunityModerator =
    await generate_random_reddit_community_platform_admin_community_moderators_create(
      moderatorConnection,
      {
        body: {
          user_id: userId,
          community_id: communityId,
        },
      },
    );
  // Validate the assignment
  typia.assert(moderatorAssignment);
  // Verify the returned moderator object contains the user and community summaries (mocked fields)
  TestValidator.equals(
    "moderator user ID matches",
    moderatorAssignment.user.id,
    userId,
  );
  TestValidator.equals(
    "moderator community ID matches",
    moderatorAssignment.community.id,
    communityId,
  );
  TestValidator.predicate("created_at is in ISO format", () => {
    return moderatorAssignment.created_at !== undefined && moderatorAssignment.created_at !== null && new Date(moderatorAssignment.created_at).toISOString() === moderatorAssignment.created_at;
  });
}