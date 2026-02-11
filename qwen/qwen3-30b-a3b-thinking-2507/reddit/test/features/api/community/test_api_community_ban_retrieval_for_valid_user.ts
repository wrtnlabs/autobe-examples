import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_ban_retrieval_for_valid_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create community as moderator
  const community = await generate_random_community_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create user to be banned
  const bannedConnection: api.IConnection = { host: connection.host };
  const banned = await authorize_member_join(bannedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  // 4. Retrieve ban details
  const banDetails = await api.functional.community.member.communities.bans.at(
    moderatorConnection,
    {
      communityId: community.id,
      userId: banned.id,
    },
  );
  typia.assert(banDetails);
  // 5. Validate ban details
  TestValidator.equals("ban user ID matches", banDetails.user?.id, banned.id);
  TestValidator.equals(
    "banned_at timestamp format",
    typeof banDetails.banned_at,
    "string",
  );
  TestValidator.equals(
    "created_at timestamp format",
    typeof banDetails.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at timestamp format",
    typeof banDetails.updated_at,
    "string",
  );
  TestValidator.predicate(
    "reason should not be undefined",
    banDetails.reason !== undefined,
  );
}
