import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test moderator search by community and authority type filtering.
 *
 * Validates that moderator search correctly filters results by both community_id and authority_type. Creates two members, establishes one as community owner and assigns the other as a moderator, then verifies that searching by authority_type MODERATOR returns only the delegated moderator and searching by OWNER returns only the community creator.
 *
 * 1. Second member joins and creates a community (becomes OWNER).
 * 2. First member joins the platform.
 * 3. Second member adds first member as MODERATOR in their community.
 * 4. Public search filters by community_id and authority_type MODERATOR, returning only the first member.
 * 5. Public search filters by community_id and authority_type OWNER, returning only the second member.
 */
export async function test_api_moderator_search_by_community_and_authority_type(
  connection: api.IConnection,
) {
  // 1. Second member joins and creates community (will be OWNER)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = RandomGenerator.alphaNumeric(16);
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: secondMemberEmail,
      password: secondMemberPassword,
    },
  });
  typia.assert(secondMember);
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      secondMemberConnection,
      {},
    );
  typia.assert(community);
  // 2. First member joins (will become MODERATOR)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = RandomGenerator.alphaNumeric(16);
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: firstMemberEmail,
      password: firstMemberPassword,
    },
  });
  typia.assert(firstMember);
  // 3. Second member (owner) adds first member as MODERATOR
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_moderators_create(
      secondMemberConnection,
      {
        body: {
          member_id: firstMember.id,
          community_id: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Use public search endpoint - no auth needed
  const searchConnection: api.IConnection = { host: connection.host };
  // Search for MODERATOR authority type
  const moderatorSearchBody = {
    community_id: community.id,
    authority_type: "MODERATOR",
  } satisfies IRedditLikeCommunityModerator.IRequest;
  const moderatorResults =
    await api.functional.redditLikeCommunity.moderators.index(
      searchConnection,
      { body: moderatorSearchBody },
    );
  typia.assert(moderatorResults);
  TestValidator.equals(
    "MODERATOR search returns exactly one result",
    moderatorResults.data.length,
    1,
  );
  TestValidator.equals(
    "MODERATOR result is first member",
    moderatorResults.data[0].member.id,
    firstMember.id,
  );
  TestValidator.equals(
    "MODERATOR result has correct community",
    moderatorResults.data[0].community.id,
    community.id,
  );
  TestValidator.equals(
    "MODERATOR result has correct authority type",
    moderatorResults.data[0].authority_type,
    "MODERATOR",
  );
  // Search for OWNER authority type
  const ownerSearchBody = {
    community_id: community.id,
    authority_type: "OWNER",
  } satisfies IRedditLikeCommunityModerator.IRequest;
  const ownerResults =
    await api.functional.redditLikeCommunity.moderators.index(
      searchConnection,
      { body: ownerSearchBody },
    );
  typia.assert(ownerResults);
  TestValidator.equals(
    "OWNER search returns exactly one result",
    ownerResults.data.length,
    1,
  );
  TestValidator.equals(
    "OWNER result is second member (community creator)",
    ownerResults.data[0].member.id,
    secondMember.id,
  );
  TestValidator.equals(
    "OWNER result has correct community",
    ownerResults.data[0].community.id,
    community.id,
  );
  TestValidator.equals(
    "OWNER result has correct authority type",
    ownerResults.data[0].authority_type,
    "OWNER",
  );
}