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

export async function test_api_administrator_community_subscriptions_list_all_members(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member accounts for testing subscriptions
  const members: ICommunityPlatformMember.IAuthorized[] = [];
  const memberCount = 5;

  for (let i = 0; i < memberCount; i++) {
    const memberEmail: string = typia.random<string & tags.Format<"email">>();
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          username: `member_${RandomGenerator.alphaNumeric(6)}`,
          password: RandomGenerator.alphaNumeric(12),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push(member);
  }

  // Step 4: Create community with first member as creator
  const communityCreatorConnection: api.IConnection = {
    ...connection,
  };
  communityCreatorConnection.headers = {
    ...connection.headers,
    Authorization: members[0].token.access,
  };

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      communityCreatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Switch to administrator context for subscription listing
  const adminConnection: api.IConnection = {
    ...connection,
  };
  adminConnection.headers = {
    ...connection.headers,
    Authorization: administrator.token.access,
  };

  // Step 6: Retrieve community subscriptions with pagination
  const subscriptionsPage1: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionsPage1);

  // Validate pagination structure exists and has correct values
  TestValidator.predicate(
    "pagination object exists with valid structure",
    subscriptionsPage1.pagination.current === 1 &&
      subscriptionsPage1.pagination.limit === 20 &&
      subscriptionsPage1.pagination.records >= 1 &&
      subscriptionsPage1.pagination.pages > 0,
  );

  // Validate data array contains subscription records
  TestValidator.predicate(
    "data array contains at least one subscription record",
    Array.isArray(subscriptionsPage1.data) &&
      subscriptionsPage1.data.length >= 1,
  );

  // Validate first subscription record has all required fields
  const firstSubscription = subscriptionsPage1.data[0];
  TestValidator.predicate(
    "subscription record contains id, community_id, member_id, and timestamps",
    firstSubscription.id !== null &&
      firstSubscription.community_id === community.id &&
      firstSubscription.member_id !== null &&
      firstSubscription.subscribed_at !== null &&
      firstSubscription.created_at !== null,
  );

  // Step 7: Test filtering by username search
  const searchResults: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "member",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search filter returns valid results",
    Array.isArray(searchResults.data),
  );

  // Step 8: Test pagination with smaller page size
  const smallPageSize: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(smallPageSize);
  TestValidator.predicate(
    "smaller page size returns correct limit in pagination",
    smallPageSize.pagination.limit === 2 && smallPageSize.data.length <= 2,
  );

  // Step 9: Test sorting by subscription date (newest first)
  const sortedByNewest: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "newest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByNewest);
  TestValidator.predicate(
    "sorted results contain valid subscription data with timestamps",
    sortedByNewest.data.length > 0 &&
      sortedByNewest.data.every(
        (sub) =>
          sub.id !== null &&
          sub.community_id !== null &&
          sub.member_id !== null &&
          sub.subscribed_at !== null &&
          sub.created_at !== null,
      ),
  );

  // Step 10: Verify pagination consistency across multiple requests
  const verifyFirstPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(verifyFirstPage);

  TestValidator.equals(
    "pagination records count remains consistent",
    verifyFirstPage.pagination.records,
    subscriptionsPage1.pagination.records,
  );
  TestValidator.equals(
    "total pages count remains consistent",
    verifyFirstPage.pagination.pages,
    subscriptionsPage1.pagination.pages,
  );
}
