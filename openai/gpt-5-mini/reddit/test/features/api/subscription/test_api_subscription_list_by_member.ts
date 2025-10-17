import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalSubscription";

export async function test_api_subscription_list_by_member(
  connection: api.IConnection,
) {
  /**
   * Goal: Register a member, create a community, subscribe the member to it,
   * then exercise the subscriptions.index endpoint for correctness, pagination,
   * input validation, and unauthenticated access handling.
   */

  // 1) Member registration
  const memberBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a community as the authenticated member
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Create a subscription to that community
  const subscriptionBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 4) Index subscriptions for authenticated member (myItems: true)
  const page: IPageICommunityPortalSubscription.ISummary =
    await api.functional.communityPortal.member.subscriptions.index(
      connection,
      {
        body: { myItems: true } satisfies ICommunityPortalSubscription.IRequest,
      },
    );
  typia.assert(page);

  // Validate that created subscription appears in returned data
  TestValidator.predicate(
    "subscription list contains created subscription",
    page.data.some((s) => s.community_id === community.id),
  );

  // Find the specific subscription item and validate its properties
  const found = page.data.find((s) => s.community_id === community.id);
  TestValidator.predicate(
    "created subscription is present",
    found !== undefined,
  );
  // Narrow and assert
  typia.assert(found!);
  TestValidator.predicate(
    "subscription.user_id present",
    found!.user_id !== undefined,
  );
  TestValidator.equals(
    "subscription user_id matches member id",
    found!.user_id,
    member.id,
  );
  TestValidator.predicate(
    "subscription has created_at",
    typeof found!.created_at === "string" && found!.created_at.length > 0,
  );

  // 5) Pagination: limit=1
  const pageLimitOne: IPageICommunityPortalSubscription.ISummary =
    await api.functional.communityPortal.member.subscriptions.index(
      connection,
      {
        body: {
          myItems: true,
          limit: 1,
          offset: 0,
        } satisfies ICommunityPortalSubscription.IRequest,
      },
    );
  typia.assert(pageLimitOne);
  TestValidator.equals(
    "pagination limit respected",
    pageLimitOne.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length not greater than limit",
    pageLimitOne.data.length <= 1,
  );

  // 6) Input validation: invalid UUID filter (communityId) should cause error
  await TestValidator.error(
    "invalid communityId filter should fail",
    async () => {
      await api.functional.communityPortal.member.subscriptions.index(
        connection,
        {
          // Intentionally invalid UUID format
          body: {
            communityId: "not-a-uuid" as unknown as string &
              tags.Format<"uuid">,
          } satisfies ICommunityPortalSubscription.IRequest,
        },
      );
    },
  );

  // 7) Unauthenticated request should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.communityPortal.member.subscriptions.index(
      unauthConn,
      {
        body: { myItems: true } satisfies ICommunityPortalSubscription.IRequest,
      },
    );
  });
}
