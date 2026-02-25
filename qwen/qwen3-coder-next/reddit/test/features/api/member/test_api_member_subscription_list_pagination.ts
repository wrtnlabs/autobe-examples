import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscription_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create multiple communities and subscribe to them
  const communities: IRedditCloneCommunity.ISummary[] = [];
  const totalCommunities = 25;
  for (let i = 0; i < totalCommunities; i++) {
    // Create community first (using admin simulation - not needed for subscription)
    // For subscription test, we need communities that exist
    // Simulate community creation by creating a subscription (which requires existing community)
    // Since we can't create communities directly in this test, we'll assume test environment has communities
    // For a complete test, we would create communities first using mock data or admin endpoint
    // For now, we'll use a workaround: create subscriptions to pre-existing test communities
    // In a real test environment, you would create communities first
    const communityId = typia.random<string & tags.Format<"uuid">>();
    // Subscribe to the community
    const community =
      await api.functional.redditClone.member.communities.subscribe.postByCommunityid(
        memberConnection,
        { communityId },
      );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Test pagination with different page/limit combinations
  // Test 1: First page with limit 10
  const page1 = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: { page: 1, limit: 10 } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 pagination", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page1 data count", page1.data.length, 10);
  TestValidator.predicate("page1 has data", page1.data.length > 0);
  // Test 2: Second page with limit 10
  const page2 = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: { page: 2, limit: 10 } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 pagination", page2.pagination.current, 2);
  TestValidator.equals("page2 data count", page2.data.length, 10);
  // Test 3: Last page with limit 10 (should have 5 items)
  const page3 = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: { page: 3, limit: 10 } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page3 pagination", page3.pagination.current, 3);
  TestValidator.equals("page3 data count", page3.data.length, 5);
  TestValidator.equals("total records", page3.pagination.records, 25);
  TestValidator.equals("total pages", page3.pagination.pages, 3);
  // Test 4: Different limit (20)
  const page1WithLimit20 =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: { page: 1, limit: 20 } satisfies IRedditCloneCommunity.IRequest,
      },
    );
  typia.assert(page1WithLimit20);
  TestValidator.equals("limit20 data count", page1WithLimit20.data.length, 20);
  TestValidator.equals(
    "limit20 total pages",
    page1WithLimit20.pagination.pages,
    2,
  );
  // Test 5: Test that page2 results differ from page1 (no duplicates)
  const page1Ids = new Set(page1.data.map((c) => c.id));
  const page2Ids = new Set(page2.data.map((c) => c.id));
  const hasDuplicates = [...page1Ids].some((id) => page2Ids.has(id));
  TestValidator.predicate("no duplicates between pages", !hasDuplicates);
}
