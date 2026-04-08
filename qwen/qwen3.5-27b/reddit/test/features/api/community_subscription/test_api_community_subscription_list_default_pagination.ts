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

/**
 * Test default pagination for community subscription list retrieval.
 *
 * Validates that the subscriptions endpoint returns properly paginated results with default parameters. Tests the complete workflow including member registration, community selection, and subscription listing with pagination metadata verification.
 *
 * The test ensures that subscription summaries contain both member profile information and community details, and that results are ordered by creation date in descending order. Since community creation is not available through the API, the test uses existing communities from the system.
 *
 * 1. Authenticate as admin member
 * 2. Retrieve list of existing communities and select one for testing
 * 3. Register 3-5 member accounts with unique credentials
 * 4. Retrieve subscriptions list with default pagination parameters
 * 5. Validate response structure including pagination metadata and nested member/community data
 * 6. Test pagination by requesting second page with reduced limit
 */
export async function test_api_community_subscription_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin member
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      username: "admin_user",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 2. Retrieve existing communities and select one
  const communities = await api.functional.redditClone.communities.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(communities);
  TestValidator.predicate(
    "communities list not empty",
    communities.data.length > 0,
  );
  const targetCommunity = communities.data[0];
  typia.assert(targetCommunity);
  // 3. Create multiple member accounts
  const memberCount = 5;
  const memberConnections: api.IConnection[] = [];
  for (let i = 0; i < memberCount; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: `member${i}@test.com`,
        password: "1234",
        username: `member_${i}`,
        href: "https://test.com",
        referrer: "https://test.com",
      },
    });
    memberConnections.push(memberConnection);
  }
  // 4. Retrieve subscriptions list with default parameters
  const subscriptionsPage1 =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: targetCommunity.id,
        body: {},
      },
    );
  typia.assert(subscriptionsPage1);
  // 5. Validate response structure
  TestValidator.predicate(
    "has pagination metadata",
    subscriptionsPage1.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    subscriptionsPage1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has positive limit",
    subscriptionsPage1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has total records",
    subscriptionsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has total pages",
    subscriptionsPage1.pagination.pages >= 0,
  );
  // 6. Validate subscription data structure
  TestValidator.predicate(
    "has subscription data array",
    Array.isArray(subscriptionsPage1.data),
  );
  if (subscriptionsPage1.data.length > 0) {
    const firstSubscription = subscriptionsPage1.data[0];
    typia.assert(firstSubscription);
    // Validate member profile is nested
    TestValidator.predicate(
      "subscription has member",
      firstSubscription.member !== undefined,
    );
    TestValidator.equals(
      "member has id",
      typeof firstSubscription.member.id,
      "string",
    );
    TestValidator.equals(
      "member has email",
      typeof firstSubscription.member.email,
      "string",
    );
    TestValidator.equals(
      "member has username",
      typeof firstSubscription.member.username,
      "string",
    );
    TestValidator.predicate(
      "member has profile",
      firstSubscription.member.profile !== undefined,
    );
    TestValidator.equals(
      "profile has display_name",
      typeof firstSubscription.member.profile.display_name,
      "string",
    );
    TestValidator.equals(
      "profile has karma",
      typeof firstSubscription.member.profile.karma,
      "number",
    );
    // Validate community is nested
    TestValidator.predicate(
      "subscription has community",
      firstSubscription.community !== undefined,
    );
    TestValidator.equals(
      "community id matches",
      firstSubscription.community.id,
      targetCommunity.id,
    );
    TestValidator.equals(
      "community has name",
      typeof firstSubscription.community.name,
      "string",
    );
    TestValidator.equals(
      "community has description",
      typeof firstSubscription.community.description,
      "string",
    );
  }
  // 7. Test pagination with page 2 and small limit
  const subscriptionsPage2 =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: targetCommunity.id,
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(subscriptionsPage2);
  TestValidator.equals(
    "page 2 current is 2",
    subscriptionsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 2",
    subscriptionsPage2.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page 2 has data array",
    Array.isArray(subscriptionsPage2.data),
  );
  TestValidator.predicate(
    "page 2 data within limit",
    subscriptionsPage2.data.length <= 2,
  );
}
