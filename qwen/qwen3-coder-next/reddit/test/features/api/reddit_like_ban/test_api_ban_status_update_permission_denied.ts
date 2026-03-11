import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_like_admin_communities_bans_create } from "../../../generate/generate_random_reddit_like_admin_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_ban_status_update_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two admin users - one will be non-moderator, another will be moderator
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAdmin = await authorize_admin_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(nonModeratorAdmin);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAdmin = await authorize_admin_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(moderatorAdmin);
  // 2. Create a ban record using the moderator connection
  // Using mock data for user and community since we need to provide them
  const mockUser = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
    karma_score: 100,
    created_at: new Date().toISOString(),
  } satisfies IRedditLikeMember.ISummary;
  const mockCommunityName = RandomGenerator.name(2);
  // Create a ban record through moderator connection
  const ban = await api.functional.redditLike.admin.communities.bans.create(
    moderatorConnection,
    {
      communityId: mockCommunityName,
      body: {
        reddit_like_user_id: mockUser.id,
        reddit_like_community_id: mockCommunityName,
        status: "active",
      } satisfies IRedditLikeBan.ICreate,
    },
  );
  typia.assert(ban);
  // 3. Non-moderator admin attempts to update the ban status
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "non-moderator should not have permission to update ban status",
    async () => {
      await api.functional.redditLike.admin.bans.update(
        nonModeratorConnection,
        {
          banId: ban.id,
          body: {
            status: "inactive",
          } satisfies IRedditLikeBan.IUpdate,
        },
      );
    },
  );
  // 4. Verify ban status remains unchanged
  TestValidator.equals("ban status remains active", ban.status, "active");
  TestValidator.notEquals(
    "ban was not modified",
    ban.updated_at,
    ban.created_at,
  );
}
