import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_subscription_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities with distinct names for search testing
  const communityNames = [
    "test_community",
    "another_test",
    "sample_forum",
    "demo_board",
  ];
  const communities = await ArrayUtil.asyncMap(communityNames, async (name) => {
    const community =
      await generate_random_reddit_clone_member_communities_create(
        memberConnection,
        {
          body: {
            name: name,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditCloneCommunity.ICreate,
        },
      );
    typia.assert(community);
    return community;
  });
  // 3. Subscribe to all communities
  await ArrayUtil.asyncForEach(communities, async (community) => {
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  });
  // 4. Search with partial name "test" - should match "test_community" and "another_test"
  const searchTestResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "test",
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchTestResult);
  // Verify search returns communities containing "test"
  TestValidator.equals(
    "search 'test' returns 2 communities",
    searchTestResult.data.length,
    2,
  );
  // Verify both matching communities are returned
  const matchedNames = searchTestResult.data.map((s) => s.community.name);
  TestValidator.predicate(
    "contains 'test_community'",
    matchedNames.includes("test_community"),
  );
  TestValidator.predicate(
    "contains 'another_test'",
    matchedNames.includes("another_test"),
  );
  // 5. Search with partial name "forum" - should match "sample_forum"
  const searchForumResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "forum",
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchForumResult);
  TestValidator.equals(
    "search 'forum' returns 1 community",
    searchForumResult.data.length,
    1,
  );
  TestValidator.equals(
    "matched community is 'sample_forum'",
    searchForumResult.data[0]?.community.name,
    "sample_forum",
  );
  // 6. Case-insensitive search - uppercase
  const searchUppercaseResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "TEST",
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchUppercaseResult);
  TestValidator.equals(
    "search 'TEST' (uppercase) returns 2 communities",
    searchUppercaseResult.data.length,
    2,
  );
  // 7. Case-insensitive search - mixed case
  const searchMixedCaseResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "TeSt",
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchMixedCaseResult);
  TestValidator.equals(
    "search 'TeSt' (mixed case) returns 2 communities",
    searchMixedCaseResult.data.length,
    2,
  );
  // 8. Search with non-existent name - should return empty
  const searchNonExistentResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "nonexistent",
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchNonExistentResult);
  TestValidator.equals(
    "search 'nonexistent' returns 0 communities",
    searchNonExistentResult.data.length,
    0,
  );
  // 9. Search with partial word should work (LIKE pattern matching)
  const searchPartialResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "board",
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchPartialResult);
  TestValidator.equals(
    "search 'board' returns 'demo_board'",
    searchPartialResult.data.length,
    1,
  );
  TestValidator.equals(
    "matched community is 'demo_board'",
    searchPartialResult.data[0]?.community.name,
    "demo_board",
  );
}
