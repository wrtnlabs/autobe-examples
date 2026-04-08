import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IPageIRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunitySubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test successful retrieval of a member's subscription list with pagination.
 *
 * Validates the complete subscription listing workflow including member authentication, community discovery, subscription creation, and paginated retrieval. Ensures that the subscription list correctly displays community details and that pagination metadata is accurate.
 *
 * Special attention is given to verifying that pagination parameters work correctly, that results are sorted by creation date in descending order (most recent subscriptions first), and that all expected subscription fields are present including nested community and member information.
 *
 * 1. Authenticate as a new member with email, password, and username.
 * 2. List existing communities to find available communities for subscription.
 * 3. Subscribe the member to at least 3 existing communities.
 * 4. Retrieve the subscription list with pagination (page=1, limit=2).
 * 5. Verify pagination metadata (current page, limit, total records, total pages).
 * 6. Verify subscription records include community details and member information.
 * 7. Confirm results are sorted by created_at descending.
 * 8. Test second page retrieval to validate multi-page pagination.
 */
export async function test_api_subscription_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. List existing communities
  const communitiesResponse =
    await api.functional.redditClone.communities.index(memberConnection, {
      body: {
        limit: 10,
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(communitiesResponse);
  TestValidator.predicate(
    "communities list not empty",
    communitiesResponse.data.length > 0,
  );
  // 3. Subscribe to multiple communities (at least 3)
  const subscriptionsToCreate = Math.min(communitiesResponse.data.length, 5);
  const createdSubscriptions: IRedditCloneCommunitySubscription[] = [];
  for (let i = 0; i < subscriptionsToCreate; i++) {
    const subscription =
      await generate_random_reddit_clone_member_subscriptions_create(
        memberConnection,
        {
          body: {
            community_id: communitiesResponse.data[i].id,
          },
        },
      );
    typia.assert(subscription);
    createdSubscriptions.push(subscription);
  }
  TestValidator.equals(
    "subscriptions created count",
    createdSubscriptions.length,
    subscriptionsToCreate,
  );
  // 4. Retrieve subscription list with pagination (page=1, limit=2)
  const page1Response =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(page1Response);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", page1Response.pagination.limit, 2);
  TestValidator.equals(
    "total records matches created subscriptions",
    page1Response.pagination.records,
    subscriptionsToCreate,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1Response.pagination.pages >= 1,
  );
  // 6. Verify subscription records include community details
  TestValidator.equals(
    "first page has 2 records",
    page1Response.data.length,
    2,
  );
  for (const subscription of page1Response.data) {
    TestValidator.predicate(
      "subscription has valid ID",
      subscription.id !== undefined,
    );
    TestValidator.predicate(
      "subscription has created_at",
      subscription.created_at !== undefined,
    );
    TestValidator.predicate(
      "subscription has updated_at",
      subscription.updated_at !== undefined,
    );
    TestValidator.predicate(
      "subscription has member info",
      subscription.member !== undefined,
    );
    TestValidator.predicate(
      "subscription has community info",
      subscription.community !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      subscription.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has description",
      subscription.community.description !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber count",
      subscription.community.subscriber_count !== undefined,
    );
  }
  // 7. Verify results are sorted by created_at descending
  if (page1Response.data.length >= 2) {
    const firstCreated = new Date(page1Response.data[0].created_at).getTime();
    const secondCreated = new Date(page1Response.data[1].created_at).getTime();
    TestValidator.predicate(
      "results sorted by created_at descending",
      firstCreated >= secondCreated,
    );
  }
  // 8. Test second page retrieval
  if (page1Response.pagination.pages >= 2) {
    const page2Response =
      await api.functional.redditClone.member.subscriptions.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies IRedditCloneCommunitySubscription.IRequest,
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "second page current is 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit is 2",
      page2Response.pagination.limit,
      2,
    );
    TestValidator.equals(
      "second page total records same",
      page2Response.pagination.records,
      subscriptionsToCreate,
    );
    // Verify second page has remaining records
    const expectedSecondPageCount = Math.max(0, subscriptionsToCreate - 2);
    TestValidator.equals(
      "second page has correct record count",
      page2Response.data.length,
      expectedSecondPageCount,
    );
    // Verify no duplicate subscriptions between pages
    const page1Ids = new Set(page1Response.data.map((s) => s.id));
    const hasDuplicates = page2Response.data.some((s) => page1Ids.has(s.id));
    TestValidator.predicate(
      "no duplicate subscriptions across pages",
      !hasDuplicates,
    );
  }
}
