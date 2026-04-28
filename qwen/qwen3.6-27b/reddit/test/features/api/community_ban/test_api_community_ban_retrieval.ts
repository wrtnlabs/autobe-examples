import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test retrieving a community ban record by its unique identifiers.
 *
 * Validates the complete ban retrieval flow including member authentication, community creation, and ban issuance. Verifies that the retrieved ban contains the expected structure: unique ban identifier, community summary with name and description, banned member summary with id and username, moderator summary with role information, ban reason text, creation and update timestamps, and null deleted_at for active bans.
 *
 * 1. Moderator member registers and authenticates.
 * 2. Target member registers (to be banned by moderator).
 * 3. Moderator creates a community.
 * 4. Moderator bans the target member from the community with a reason.
 * 5. Retrieve the ban record using community id and ban id.
 * 6. Validate the ban response matches the created ban data.
 */
export async function test_api_community_ban_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderate member authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: { password: "1234" },
  });
  typia.assert(moderator);
  // 2. Target member registration (to be banned)
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {
    body: { password: "1234" },
  });
  typia.assert(target);
  // 3. Moderator creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 4. Moderator bans target member
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: { member_id: target.id, reason: "Violation of community rules" },
      },
    );
  typia.assert(ban);
  // 5. Retrieve the ban record
  const retrieveConnection: api.IConnection = { host: connection.host };
  const retrieved =
    await api.functional.redditLikeCommunity.communities.community_bans.at(
      retrieveConnection,
      {
        communityId: community.id,
        communityBanId: ban.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate retrieved ban
  TestValidator.equals("ban id matches", retrieved.id, ban.id);
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrieved.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member id matches",
    retrieved.member.id,
    target.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrieved.member.username,
    target.username,
  );
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    "Violation of community rules",
  );
  TestValidator.predicate(
    "created_at is present",
    retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrieved.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active ban",
    retrieved.deleted_at,
    null,
  );
}
