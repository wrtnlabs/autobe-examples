import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { generate_random_reddit_like_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_like_moderator_communities_bans_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";

export async function test_api_moderator_ban_removal_by_non_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create connections for different actors
  const memberConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Register and login as regular member
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberData);
  // 3. Register and login as moderator
  const moderatorData = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderatorData);
  // 4. Create a ban record using moderator connection
  // Using a test community ID since community creation endpoint is not available in the provided SDK
  const communityId = "00000000-0000-0000-0000-000000000001";
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    moderatorConnection,
    {
      communityId: communityId,
      body: {
        reddit_like_user_id: memberData.id,
        reddit_like_community_id: communityId,
        status: "active",
      } satisfies IRedditLikeBan.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Attempt to delete the ban with regular member connection (should fail with 403)
  await TestValidator.error(
    "should return 403 Forbidden for unauthorized ban removal",
    async () => {
      await api.functional.redditLike.moderator.bans.erase(memberConnection, {
        banId: ban.id,
      });
    },
  );
}
