import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

export async function test_api_community_subscription_empty_community(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 2: Create a category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberBody = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphabets(10),
    ip: "127.0.0.1",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Step 4: Create a community
  const communityBody = {
    name: RandomGenerator.name(3),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // Step 5: Retrieve subscriptions for the community
  const subscriptionRequest = {
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const subscriptionResponse =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: subscriptionRequest,
      },
    );
  typia.assert(subscriptionResponse);

  // Step 6: Validate response structure
  TestValidator.predicate(
    "subscription response has pagination object",
    subscriptionResponse.pagination !== null &&
      subscriptionResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination has current page",
    subscriptionResponse.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination has limit",
    subscriptionResponse.pagination.limit >= 1,
  );

  TestValidator.predicate(
    "pagination has records count",
    subscriptionResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination has pages count",
    subscriptionResponse.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "subscription data is array",
    Array.isArray(subscriptionResponse.data),
  );

  // Step 7: Validate that creator is in subscription list
  TestValidator.predicate(
    "creator is subscribed to the community",
    subscriptionResponse.pagination.records >= 1,
  );

  // Step 8: Validate subscription entries have correct structure
  if (subscriptionResponse.data.length > 0) {
    const firstSubscription = subscriptionResponse.data[0];
    TestValidator.predicate(
      "subscription has id",
      firstSubscription.id !== null && firstSubscription.id !== undefined,
    );

    TestValidator.predicate(
      "subscription has community_id",
      firstSubscription.community_id === community.id,
    );

    TestValidator.predicate(
      "subscription has member_id",
      firstSubscription.member_id !== null &&
        firstSubscription.member_id !== undefined,
    );

    TestValidator.predicate(
      "subscription has subscribed_at timestamp",
      firstSubscription.subscribed_at !== null &&
        firstSubscription.subscribed_at !== undefined,
    );

    TestValidator.predicate(
      "subscription has created_at timestamp",
      firstSubscription.created_at !== null &&
        firstSubscription.created_at !== undefined,
    );
  }
}
