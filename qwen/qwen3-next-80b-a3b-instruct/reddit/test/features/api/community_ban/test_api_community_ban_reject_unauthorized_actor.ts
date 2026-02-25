import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_community_community_moderator_communities_bans_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";

export async function test_api_community_ban_reject_unauthorized_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular member with no moderation privileges
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(member);
  // 2. Generate a random community ID to attempt banning against
  // (We cannot create communities via available functions, so we use a valid UUID)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate another random user ID to ban
  const userIdToBan = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to ban user from community as unauthorized member (must fail with 403)
  await TestValidator.httpError(
    "unauthorized actor attempt to ban",
    403,
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.bans.create(
        memberConnection,
        {
          communityId,
          body: {
            user_id: userIdToBan,
            reason: "Unauthorized ban attempt test",
          } satisfies IRedditCommunityBan.ICreate,
        },
      );
    },
  );
}
