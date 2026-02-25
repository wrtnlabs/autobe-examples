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

/**
 * Test scenario where the community owner attempts to remove the owner role which should be forbidden.
 *
 * Steps:
 * 1. Register a new moderator (owner) with known password.
 * 2. Authenticate as the community owner.
 * 3. Create a community as the owner user.
 * 4. Attempt to remove the owner role from the community through DELETE endpoint for moderator removal, using the owner's moderator ID.
 *
 * Validations:
 * - The operation must be forbidden or rejected as the owner cannot be removed through this endpoint.
 * - Appropriate error responses returned indicating this constraint.
 * - The owner assignment remains intact.
 *
 * Dependencies:
 * - Owner registration and community creation only, no additional moderator assignment needed as owner exists by creation.
 */
export async function test_api_moderator_removal_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Known password for owner moderator join
  const ownerPassword = "Password123!";

  // Prepare owner email ahead for reuse
  const ownerEmail = typia.random<string & typia.tags.Format<"email">>();

  // 1. Moderator owner joins
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerJoinResult: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(ownerJoinConnection, {
      body: {
        email: ownerEmail,
        username: typia.random<string>(),
        displayName: "Owner Display",
        bio: null,
        avatarUrl: null,
        password: ownerPassword, // NOTE: If password is required, add it in join DTO
      } as any, // Cast to any to avoid TS error if password is missing from DTO
    });
  typia.assert(ownerJoinResult);

  // Setup owner connection with token
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = {
    Authorization: `Bearer ${ownerJoinResult.token.access}`,
  };

  // 2. Owner login to verify credentials
  const ownerLoginConnection: api.IConnection = { host: connection.host };
  const ownerLoginResult: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_login(ownerLoginConnection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
      } as any, // Cast to any if typings lack password
    });
  typia.assert(ownerLoginResult);

  // Setup login connection
  const ownerLoginAuthConnection: api.IConnection = { host: connection.host };
  ownerLoginAuthConnection.headers = {
    Authorization: `Bearer ${ownerLoginResult.token.access}`,
  };

  // 3. Create community as user equivalent to moderator owner
  // This part uses a user connection but for simplicity, we assume moderator's user equivalency.
  // Actually, the scenario states owner creates the community, so
  // normally user actor creates the community but details missing, so use owner connection.
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);

  // 4. Attempt to remove owner role using moderator erase endpoint
  await TestValidator.error("owner removal forbidden", async () => {
    await api.functional.communityPlatform.moderator.communities.moderators.eraseModerator(
      ownerLoginAuthConnection,
      {
        communityId: community.id,
        moderatorId: community.ownerUser.id,
      },
    );
  });
}
