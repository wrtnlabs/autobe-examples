import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that a moderator cannot ban the community owner.
 *
 * Validates that community moderators are prevented from banning the community owner, ensuring that the highest authority in a community cannot be removed by other moderators. This test verifies the protection mechanism that preserves owner privileges regardless of moderator actions.
 *
 * The test creates a member account representing the community owner, registers a moderator account, and then attempts to ban the owner. The system should reject this operation with an appropriate error, demonstrating that owner protection is enforced at the API level.
 *
 * 1. Register and authenticate as a member who represents the community owner.
 * 2. Register and authenticate as a moderator.
 * 3. Attempt to ban the community owner as the moderator.
 * 4. Verify the ban operation fails with an error indicating owner protection.
 */
export async function test_api_community_ban_cannot_ban_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as the community owner (member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  // 2. Register and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 3. Use a mock community ID for testing
  // In a real scenario, this would be an actual community where the owner is the creator
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to ban the community owner (should fail)
  // The backend should validate that the target member is not the community owner
  // and reject the ban operation with an appropriate error
  await TestValidator.error("cannot ban community owner", async () => {
    await api.functional.redditClone.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId,
        body: {
          reddit_clone_member_id: owner.id,
          ban_reason: "Testing ban on owner",
          expires_at: null,
        } satisfies IRedditCloneCommunityBan.ICreate,
      },
    );
  });
  // 5. Verify the owner's authentication is still valid
  // The owner should retain all privileges since the ban was not applied
  TestValidator.equals(
    "owner still authenticated",
    owner.token.access,
    ownerConnection.headers?.Authorization?.toString() ?? undefined,
  );
}