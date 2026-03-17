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

export async function test_api_community_ban_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member
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
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Test ban list retrieval with default pagination
  const banListDefault =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListDefault);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    banListDefault.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(banListDefault.data),
  );
  TestValidator.predicate(
    "current page is at least 1",
    banListDefault.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    banListDefault.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    banListDefault.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    banListDefault.pagination.pages >= 0,
  );
  // 4. Test ban list retrieval with custom pagination (page 1, limit 10)
  const banListPage1 =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListPage1);
  TestValidator.equals("page 1 current", banListPage1.pagination.current, 1);
  TestValidator.equals("page 1 limit", banListPage1.pagination.limit, 10);
  // 5. Test ban list retrieval with page 2
  const banListPage2 =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListPage2);
  TestValidator.equals("page 2 current", banListPage2.pagination.current, 2);
  TestValidator.equals("page 2 limit", banListPage2.pagination.limit, 10);
  // 6. Test sorting by created_at
  const banListSortCreatedAt =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          sort: "created_at",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListSortCreatedAt);
  // 7. Test sorting by member username
  const banListSortMember =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          sort: "member",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListSortMember);
  // 8. Test sorting by issuer username
  const banListSortIssuer =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          sort: "issuer",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListSortIssuer);
  // 9. Test search functionality
  const banListSearch =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          search: "test",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListSearch);
  // 10. Test combined pagination, sorting, and search
  const banListCombined =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 15,
          sort: "created_at",
          search: "user",
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banListCombined);
  TestValidator.equals("combined page", banListCombined.pagination.current, 1);
  TestValidator.equals("combined limit", banListCombined.pagination.limit, 15);
  // 11. Validate ban record structure if any bans exist
  if (banListDefault.data.length > 0) {
    const firstBan = banListDefault.data[0];
    TestValidator.predicate("ban has id", firstBan.id !== undefined);
    TestValidator.predicate("ban has reason", firstBan.reason !== undefined);
    TestValidator.predicate(
      "ban has created_at",
      firstBan.created_at !== undefined,
    );
    TestValidator.predicate("ban has member", firstBan.member !== undefined);
    TestValidator.predicate("ban has issuer", firstBan.issuer !== undefined);
    TestValidator.predicate(
      "member has username",
      firstBan.member.username !== undefined,
    );
    TestValidator.predicate(
      "issuer has username",
      firstBan.issuer.username !== undefined,
    );
  }
}
