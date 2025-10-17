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

export async function test_api_subscription_list_by_owner(
  connection: api.IConnection,
) {
  // 1) Register a new member (ownerUser)
  const ownerBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const owner: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: ownerBody,
    });
  typia.assert(owner);

  TestValidator.predicate(
    "owner user id exists",
    owner.id !== undefined && owner.id !== null && owner.id.length > 0,
  );

  // 2) Create a public community as the owner
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(6),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.predicate(
    "community id present",
    community.id !== undefined &&
      community.id !== null &&
      community.id.length > 0,
  );

  // 3) Subscribe the owner to the created community
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

  // 4) List subscriptions for the owner
  const page: IPageICommunityPortalSubscription.ISummary =
    await api.functional.communityPortal.member.users.subscriptions.index(
      connection,
      {
        userId: owner.id,
      },
    );
  typia.assert(page);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    page.pagination !== null && page.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has numeric properties",
    typeof page.pagination.current === "number" &&
      typeof page.pagination.limit === "number" &&
      typeof page.pagination.records === "number",
  );

  // When we have data, the pagination.records should reflect at least one record
  TestValidator.predicate(
    "records/payload consistency",
    (Array.isArray(page.data) && page.data.length === 0) ||
      (page.pagination.records >= page.data.length &&
        page.pagination.records >= 0),
  );

  // Validate that at least one subscription exists and matches the created community
  TestValidator.predicate(
    "subscriptions array present",
    Array.isArray(page.data) && page.data.length >= 1,
  );

  const found = page.data.find((s) => s.community_id === community.id);
  TestValidator.predicate(
    "created subscription appears in list",
    found !== undefined,
  );

  if (found) {
    typia.assert(found);
    // user_id is optional in the summary; check it explicitly
    TestValidator.predicate(
      "subscription user_id equals owner id",
      found.user_id === owner.id,
    );
    TestValidator.equals(
      "subscription community matches",
      found.community_id,
      community.id,
    );
  }
}
