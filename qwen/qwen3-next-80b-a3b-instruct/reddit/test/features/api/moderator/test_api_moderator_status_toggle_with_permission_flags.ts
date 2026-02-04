import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_status_toggle_with_permission_flags(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(24),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(owner);
  // Step 2: Create target moderator account
  const targetConnection: api.IConnection = { host: connection.host };
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetModerator = await authorize_moderator_join(targetConnection, {
    body: {
      email: targetEmail,
      password: RandomGenerator.alphaNumeric(24),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(targetModerator);
  // Step 3: Use owner connection to update target moderator
  const updateResult =
    await api.functional.communityPlatform.moderator.moderators.update(
      ownerConnection,
      {
        moderatorId: targetModerator.id,
        body: {
          status: "suspended", // Toggle status from active to suspended
          permissions: {
            can_delete_posts: true, // Enable delete posts permission
            can_delete_comments: false, // Disable delete comments permission
            can_ban_users: true, // Enable ban users permission
          },
        } satisfies ICommunityPlatformModerator.IUpdate,
      },
    );
  typia.assert(updateResult);
  // Step 4: Validate results - only properties available in response type
  TestValidator.equals(
    "moderator id matches",
    updateResult.id,
    targetModerator.id,
  );
  TestValidator.equals(
    "community name matches",
    updateResult.community.name,
    targetModerator.community.name,
  );
}
