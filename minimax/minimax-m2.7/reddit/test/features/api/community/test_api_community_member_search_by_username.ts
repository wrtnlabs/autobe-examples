import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostTextContent";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_community_member_search_by_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member to access the search endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMemberSession.IJoin,
  });
  typia.assert(member);
  // 2. Create a community to search members within
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create additional members who will be searchable in the community
  const searchTermBase = RandomGenerator.alphabets(4).toLowerCase();
  for (const idx of ArrayUtil.repeat(3, (i) => i)) {
    const searchMemberConnection: api.IConnection = { host: connection.host };
    const searchMember = await authorize_member_join(searchMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        username: `${searchTermBase}_member_${idx}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMemberSession.IJoin,
    });
    typia.assert(searchMember);
    // 4. Subscribe the additional members to the community
    await generate_random_reddit_clone_member_subscriptions_create(
      searchMemberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  }
  // 5. Perform search with a searchTerm that matches part of a username
  const searchResult =
    await api.functional.redditClone.member.communities.users.search(
      memberConnection,
      {
        communityName: community.name,
        body: {
          searchTerm: searchTermBase,
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostTextContent.ISearchRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Verify the response contains paginated results with matching members
  TestValidator.equals("has data", searchResult.data.length > 0, true);
  TestValidator.equals(
    "has pagination",
    searchResult.pagination !== null,
    true,
  );
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    searchResult.pagination.pages >= 0,
  );
  // Verify each member has required fields
  for (const subscription of searchResult.data) {
    TestValidator.predicate("member has id", subscription.member.id.length > 0);
    TestValidator.predicate(
      "member has username",
      subscription.member.username.length > 0,
    );
    TestValidator.predicate(
      "member has created_at",
      subscription.member.created_at.length > 0,
    );
    TestValidator.predicate(
      "member has profile",
      subscription.member.profile !== null,
    );
    TestValidator.predicate(
      "member has karma_count",
      typeof subscription.member.karma_count === "number",
    );
    TestValidator.predicate(
      "profile has display_name",
      subscription.member.profile.display_name.length > 0,
    );
  }
  // 7. Verify the search is case-insensitive by searching with different letter cases
  const upperCaseSearch =
    await api.functional.redditClone.member.communities.users.search(
      memberConnection,
      {
        communityName: community.name,
        body: {
          searchTerm: searchTermBase.toUpperCase(),
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostTextContent.ISearchRequest,
      },
    );
  typia.assert(upperCaseSearch);
  TestValidator.equals(
    "case-insensitive search returns results",
    upperCaseSearch.data.length > 0,
    true,
  );
  // 8. Search with empty searchTerm returns all community members
  const allMembersSearch =
    await api.functional.redditClone.member.communities.users.search(
      memberConnection,
      {
        communityName: community.name,
        body: {
          searchTerm: "",
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostTextContent.ISearchRequest,
      },
    );
  typia.assert(allMembersSearch);
  TestValidator.predicate(
    "empty search returns members",
    allMembersSearch.data.length > 0,
  );
}
