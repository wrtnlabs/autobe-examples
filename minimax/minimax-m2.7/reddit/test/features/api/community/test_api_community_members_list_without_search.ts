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

export async function test_api_community_members_list_without_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create additional members and subscribe them to the community
  const memberCount = 5;
  const memberConnections: api.IConnection[] = [];
  for (let i = 0; i < memberCount; i++) {
    const mc: api.IConnection = { host: connection.host };
    const _member = await authorize_member_join(mc, {});
    memberConnections.push(mc);
    await generate_random_reddit_clone_member_subscriptions_create(mc, {
      body: {
        community_id: community.id,
      } satisfies IRedditClonePostTextContent.ICreate,
    });
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 4. Search without searchTerm - should return all members sorted by created_at desc
  const allMembersResult =
    await api.functional.redditClone.member.communities.users.search(
      memberConnection,
      {
        communityName: community.name,
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostTextContent.ISearchRequest,
      },
    );
  typia.assert(allMembersResult);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "total records match",
    allMembersResult.pagination.records,
    memberCount + 1,
  );
  TestValidator.equals(
    "limit matches request",
    allMembersResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page is 1",
    allMembersResult.pagination.current,
    1,
  );
  // 6. Validate all members are returned (6 total: 1 creator + 5 subscribed)
  TestValidator.equals(
    "all members returned",
    allMembersResult.data.length,
    memberCount + 1,
  );
  // 7. Validate sorting - results should be sorted by subscription created_at descending
  for (let i = 0; i < allMembersResult.data.length - 1; i++) {
    const current = new Date(allMembersResult.data[i].created_at).getTime();
    const next = new Date(allMembersResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `member ${i} should have later/equal subscription than member ${i + 1}`,
      current >= next,
    );
  }
  // 8. Test pagination - request page 2 with small limit
  const page2Result =
    await api.functional.redditClone.member.communities.users.search(
      memberConnection,
      {
        communityName: community.name,
        body: {
          limit: 3,
          page: 2,
        } satisfies IRedditClonePostTextContent.ISearchRequest,
      },
    );
  typia.assert(page2Result);
  // 9. Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 has same total records",
    page2Result.pagination.records,
    memberCount + 1,
  );
  TestValidator.equals("page 2 limit is 3", page2Result.pagination.limit, 3);
  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );
  // 10. Validate page 2 returns correct subset (3 members)
  TestValidator.equals("page 2 returns 3 members", page2Result.data.length, 3);
  // 11. Request last page
  const lastPageResult =
    await api.functional.redditClone.member.communities.users.search(
      memberConnection,
      {
        communityName: community.name,
        body: {
          limit: 3,
          page: 3,
        } satisfies IRedditClonePostTextContent.ISearchRequest,
      },
    );
  typia.assert(lastPageResult);
  TestValidator.equals(
    "last page returns remaining members",
    lastPageResult.data.length,
    0,
  );
  // 12. Test with empty searchTerm - should behave same as omitting it
  const emptySearchResult =
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
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty searchTerm returns all members",
    emptySearchResult.data.length,
    memberCount + 1,
  );
}
