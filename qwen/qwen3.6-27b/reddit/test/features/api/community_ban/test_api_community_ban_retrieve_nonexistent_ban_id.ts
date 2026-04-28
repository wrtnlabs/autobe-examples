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
 * Test retrieving a non-existent ban record by using a fabricated UUID.
 *
 * Validates that the ban retrieval endpoint correctly returns a 404 Not Found response when
 * attempting to look up a ban record with an ID that does not exist in the system. This ensures
 * the endpoint handles invalid identifiers gracefully without exposing internal system errors
 * or unintended data.
 *
 * The test first establishes a realistic context by creating a community, two members, and an
 * active ban record. Then it uses a completely fabricated UUID to attempt to retrieve a
 * non-existent ban, confirming the system responds appropriately.
 *
 * 1. Authenticate as member 1 who will create the community.
 * 2. Create a community with member 1 as owner.
 * 3. Authenticate as member 2 who will be banned.
 * 4. Use member 1 to ban member 2 from the community.
 * 5. Generate a fabricated UUID that does not match any existing ban.
 * 6. Attempt to retrieve the ban using the fabricated UUID.
 * 7. Validate that an HTTP 404 Not Found error is returned.
 */
export async function test_api_community_ban_retrieve_nonexistent_ban_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member 1 (community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, { body: {} });
  typia.assert(member1Authorized);
  // 2. Create a community with member 1 as owner
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as member 2 (to be banned)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, { body: {} });
  typia.assert(member2Authorized);
  // 4. Create a ban for member 2 in the community (as member 1)
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      member1Connection,
      {
        params: { communityId: community.id },
        body: { member_id: member2Authorized.id },
      },
    );
  typia.assert(ban);
  // 5. Generate a fabricated UUID for non-existent ban
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // 6 & 7. Attempt to retrieve the ban and validate 404 error
  await TestValidator.httpError(
    "non-existent ban returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.bans.at(member1Connection, {
        banId: nonExistentBanId,
      });
    },
  );
}