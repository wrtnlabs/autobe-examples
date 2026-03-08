import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_like_moderator_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_moderator_ban_update_owner_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a ban record through community bans endpoint
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: `owner${RandomGenerator.alphaNumeric(6)}@test.com`,
      username: `owner_user_${RandomGenerator.alphaNumeric(6)}`,
      display_name: `Owner User ${RandomGenerator.name()}`,
      password: "Password123!",
      bio: "Community owner moderator",
      avatar_url: null,
      href: "https://example.com/profile1",
      referrer: "https://example.com/ref1",
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Create a user to ban (using random ID for testing)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    ownerConnection,
    {
      communityId,
      body: {
        reddit_like_user_id: userId,
        reddit_like_community_id: communityId,
        status: "active",
      } satisfies IRedditLikeBan.ICreate,
    },
  );
  typia.assert(ban);
  // 2. Update ban status as owner (higher privilege moderator)
  const updatedBan = await api.functional.redditLike.moderator.bans.update(
    ownerConnection,
    {
      banId: ban.id,
      body: {
        status: "inactive",
      } satisfies IRedditLikeBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 3. Verify ban status was updated correctly
  TestValidator.equals("ban status updated", updatedBan.status, "inactive");
  TestValidator.equals(
    "community id preserved",
    updatedBan.reddit_like_community_id,
    communityId,
  );
  TestValidator.equals(
    "user id preserved",
    updatedBan.reddit_like_user_id,
    userId,
  );
  // 4. Test multiple status transitions
  const ban2 =
    await api.functional.redditLike.moderator.communities.bans.create(
      ownerConnection,
      {
        communityId,
        body: {
          reddit_like_user_id: userId,
          reddit_like_community_id: communityId,
          status: "active",
        } satisfies IRedditLikeBan.ICreate,
      },
    );
  typia.assert(ban2);
  // Update to inactive
  const updatedBan2 = await api.functional.redditLike.moderator.bans.update(
    ownerConnection,
    {
      banId: ban2.id,
      body: {
        status: "inactive",
      } satisfies IRedditLikeBan.IUpdate,
    },
  );
  typia.assert(updatedBan2);
  TestValidator.equals("second ban inactive", updatedBan2.status, "inactive");
  // Update back to active
  const updatedBan3 = await api.functional.redditLike.moderator.bans.update(
    ownerConnection,
    {
      banId: ban2.id,
      body: {
        status: "active",
      } satisfies IRedditLikeBan.IUpdate,
    },
  );
  typia.assert(updatedBan3);
  TestValidator.equals("third ban active", updatedBan3.status, "active");
}
