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

export async function test_api_community_ban_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberJoinData,
  });
  typia.assert(member);
  // Step 2: Create a community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: (() => {
      let password = RandomGenerator.alphaNumeric(16);
      if (!/[0-9]/.test(password)) password = password.replace(/[^0-9]/, "1");
      if (!/[!@#$%^&*]/.test(password))
        password = password.replace(/[^0-9a-zA-Z]/, "!");
      return password;
    })(),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorJoinData },
  );
  typia.assert(moderator);
  // Step 3: Get community ID (assume the moderator is assigned to a community)
  const communityId = moderator.community.id;
  // Step 4: Ban the member as moderator using utility function
  const banReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const banResponse =
    await generate_random_reddit_community_community_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: member.id,
          reason: banReason,
        },
        params: {
          communityId,
        },
      },
    );
  typia.assert(banResponse);
  // Step 5: Validate ban response
  TestValidator.equals("ban user_id matches", banResponse.user.id, member.id);
  TestValidator.equals(
    "ban community_id matches",
    banResponse.community.id,
    communityId,
  );
  TestValidator.equals("ban reason matches", banResponse.reason, banReason);
  TestValidator.predicate("ban is active", banResponse.is_active === true);
  TestValidator.equals(
    "ban created_at exists",
    typeof banResponse.created_at,
    "string",
  );
  TestValidator.equals(
    "ban updated_at exists",
    typeof banResponse.updated_at,
    "string",
  );
  TestValidator.predicate(
    "ban has UUID ID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      banResponse.id,
    ),
  );
}
