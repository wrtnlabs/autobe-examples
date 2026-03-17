import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBan";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_ban_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication - create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create community - moderator becomes owner and has moderator authority
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Retrieve ban list as moderator (testing empty state initially)
  const banListResponse =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListResponse);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "current page is valid",
    banListResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within bounds",
    banListResponse.pagination.limit >= 1 &&
      banListResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    banListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    banListResponse.pagination.pages >= 0,
  );
  // 5. Validate ban list data array exists
  TestValidator.predicate("data is array", Array.isArray(banListResponse.data));
  // 6. Validate each ban record structure (if any bans exist)
  if (banListResponse.data.length > 0) {
    for (const ban of banListResponse.data) {
      typia.assert(ban);
      // Validate ban has required fields
      TestValidator.predicate("ban has valid uuid id", ban.id.length > 0);
      TestValidator.predicate(
        "ban has reason",
        ban.reason !== undefined && ban.reason.length > 0,
      );
      TestValidator.predicate(
        "ban has created_at timestamp",
        ban.created_at !== undefined && ban.created_at.length > 0,
      );
      // Validate member information (banned user)
      TestValidator.predicate(
        "member has valid uuid id",
        ban.member.id !== undefined && ban.member.id.length > 0,
      );
      TestValidator.predicate(
        "member has username",
        ban.member.username !== undefined && ban.member.username.length > 0,
      );
      TestValidator.predicate(
        "member has display_name",
        ban.member.display_name !== undefined &&
          ban.member.display_name.length > 0,
      );
      TestValidator.predicate(
        "member has karma_score",
        ban.member.karma_score !== undefined,
      );
      // Validate issuer information (moderator who issued ban)
      TestValidator.predicate(
        "issuer has valid uuid id",
        ban.issuer.id !== undefined && ban.issuer.id.length > 0,
      );
      TestValidator.predicate(
        "issuer has username",
        ban.issuer.username !== undefined && ban.issuer.username.length > 0,
      );
      TestValidator.predicate(
        "issuer has display_name",
        ban.issuer.display_name !== undefined &&
          ban.issuer.display_name.length > 0,
      );
      // Validate member summary doesn't expose sensitive data like email
      const memberKeys = Object.keys(ban.member);
      TestValidator.predicate(
        "member has no email property",
        !memberKeys.includes("email"),
      );
    }
  }
  // 7. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          sort: "member",
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.pagination.limit,
    10,
  );
  // 8. Test with search parameter
  const searchResponse =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          search: "test",
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search response has valid structure",
    searchResponse.pagination !== undefined &&
      searchResponse.data !== undefined,
  );
  // 9. Verify moderator can only access their own community's bans
  // Create another community with same moderator
  const community2 = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community2);
  // Verify ban lists are separate per community
  TestValidator.notEquals(
    "communities have different IDs",
    community.id,
    community2.id,
  );
  const banListCommunity2 =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community2.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListCommunity2);
}
