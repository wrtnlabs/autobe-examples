import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test community ban list retrieval with pagination by moderator.
 *
 * Validates that community moderators can access the ban list endpoint with pagination parameters. The test verifies proper access control, pagination metadata structure, and the ability to filter ban records by various criteria.
 *
 * The scenario follows a complete workflow: (1) owner registers and creates a community, (2) owner adds another member as moderator, (3) moderator authenticates and accesses the ban list endpoint with pagination parameters. Since no bans exist yet, the response should include empty data array with valid pagination metadata.
 *
 * 1. Owner registers with unique email, password, and username.
 * 2. Owner creates a community with unique name and description.
 * 3. Moderator candidate registers with unique credentials.
 * 4. Owner adds moderator candidate to the community.
 * 5. Moderator authenticates and retrieves ban list with pagination parameters.
 * 6. Validates pagination metadata (current page, limit, total records, total pages).
 * 7. Validates empty data array since no bans exist.
 * 8. Validates that filtering parameters are accepted without errors.
 */
export async function test_api_community_ban_list_retrieval_with_pagination_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Moderator candidate registers
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 3. Owner adds moderator to community
  await generate_random_reddit_like_member_communities_moderators_create(
    ownerConnection,
    {
      body: {
        member_id: moderator.id,
      } satisfies IRedditLikeCommunityModerator.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  // 4. Moderator retrieves ban list with pagination
  const banList = await api.functional.redditLike.member.communities.bans.index(
    moderatorConnection,
    {
      communityId: community.id,
      body: {
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(banList);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", banList.pagination.current, 1);
  TestValidator.equals("limit", banList.pagination.limit, 10);
  TestValidator.equals("total records", banList.pagination.records, 0);
  TestValidator.predicate(
    "total pages is zero",
    banList.pagination.pages === 0,
  );
  // 6. Validate empty data array
  TestValidator.equals("data array is empty", banList.data.length, 0);
  // 7. Test with member_id filter (no matching bans)
  const filteredBanList =
    await api.functional.redditLike.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          member_id: moderator.id,
          limit: 10,
        } satisfies IRedditLikeCommunityBan.IRequest,
      },
    );
  typia.assert(filteredBanList);
  TestValidator.equals(
    "filtered data is empty",
    filteredBanList.data.length,
    0,
  );
}
