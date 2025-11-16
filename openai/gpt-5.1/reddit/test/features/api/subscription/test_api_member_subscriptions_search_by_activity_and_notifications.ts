import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Validate member user subscription search filtering by activity and
 * notification flags.
 *
 * Business goal: Ensure that PATCH /communityPlatform/memberUser/subscriptions
 * correctly filters the authenticated member's community subscriptions by the
 * `is_active` and `receive_notifications` flags, and that it returns a
 * consistent, paginated summary view.
 *
 * Flow:
 *
 * 1. Register a new member user via auth.memberUser.join to obtain an
 *    authenticated context and the memberUserId.
 * 2. Create two distinct communities as that member.
 * 3. Create three subscriptions for the member:
 *
 *    - SubActiveNoti: active + notifications enabled -> community A
 *    - SubInactiveNoti: inactive + notifications enabled -> community B
 *    - SubActiveNoNoti: active + notifications disabled -> community B
 * 4. Call subscriptions.index (PATCH /communityPlatform/memberUser/subscriptions)
 *    with filters { is_active: true, receive_notifications: true } and
 *    page/limit big enough to cover all created records.
 * 5. Verify that:
 *
 *    - The result page contains at least one record.
 *    - The set of returned subscription IDs contains subActiveNoti.id among our
 *         three created ones.
 *    - Every returned summary has receive_notifications === true.
 * 6. Repeat with filters { is_active: false, receive_notifications: true } and
 *    expect the inactive + notifications-enabled subscription (subInactiveNoti)
 *    to be included among our created ones, and receive_notifications === true
 *    on summaries.
 * 7. Repeat with filters { is_active: true, receive_notifications: false } and
 *    expect the active + notifications-disabled subscription (subActiveNoNoti)
 *    to be included among our created ones, and receive_notifications === false
 *    on summaries.
 */
export async function test_api_member_subscriptions_search_by_activity_and_notifications(
  connection: api.IConnection,
) {
  // 1. Register (join) a new member user and obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const memberUserId = authorized.id;

  // 2. Create two distinct communities as this member.
  const communityABody = {
    slug: `community-a-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const communityBBody = {
    slug: `community-b-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // 3. Create three subscriptions with different flag combinations.
  const subActiveNotiBody = {
    community_platform_community_id: communityA.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subActiveNoti: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subActiveNotiBody,
      },
    );
  typia.assert(subActiveNoti);

  const subInactiveNotiBody = {
    community_platform_community_id: communityB.id,
    is_active: false,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subInactiveNoti: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subInactiveNotiBody,
      },
    );
  typia.assert(subInactiveNoti);

  const subActiveNoNotiBody = {
    community_platform_community_id: communityB.id,
    is_active: true,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subActiveNoNoti: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subActiveNoNotiBody,
      },
    );
  typia.assert(subActiveNoNoti);

  // Helper to extract IDs from summaries for membership checks.
  const collectIds = (
    page: IPageICommunityPlatformCommunitySubscription.ISummary,
  ): string[] => page.data.map((s) => s.id);

  // 4. Query subscriptions with is_active=true, receive_notifications=true.
  const pageTrueTrueBody = {
    page: 0,
    limit: 20,
    order_by: "created_at",
    order_direction: "asc",
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const pageTrueTrue: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      { body: pageTrueTrueBody },
    );
  typia.assert(pageTrueTrue);

  TestValidator.predicate(
    "at least one subscription returned for is_active=true & receive_notifications=true",
    pageTrueTrue.data.length > 0,
  );

  const idsTrueTrue = collectIds(pageTrueTrue);

  // Every returned summary must have receive_notifications === true.
  for (const summary of pageTrueTrue.data) {
    TestValidator.predicate(
      "summary.receive_notifications must be true for true/true filter",
      summary.receive_notifications === true,
    );
  }

  // The active+notifications-enabled subscription must be included.
  TestValidator.predicate(
    "subActiveNoti must be included in true/true filter result",
    idsTrueTrue.includes(subActiveNoti.id),
  );

  // The inactive or notifications-disabled subscriptions must not appear.
  TestValidator.predicate(
    "subInactiveNoti must not be included in true/true filter result",
    !idsTrueTrue.includes(subInactiveNoti.id),
  );
  TestValidator.predicate(
    "subActiveNoNoti must not be included in true/true filter result",
    !idsTrueTrue.includes(subActiveNoNoti.id),
  );

  // 6. Query with is_active=false, receive_notifications=true.
  const pageFalseTrueBody = {
    page: 0,
    limit: 20,
    order_by: "created_at",
    order_direction: "asc",
    is_active: false,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const pageFalseTrue: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      { body: pageFalseTrueBody },
    );
  typia.assert(pageFalseTrue);

  TestValidator.predicate(
    "at least one subscription returned for is_active=false & receive_notifications=true",
    pageFalseTrue.data.length > 0,
  );

  const idsFalseTrue = collectIds(pageFalseTrue);

  for (const summary of pageFalseTrue.data) {
    TestValidator.predicate(
      "summary.receive_notifications must be true for false/true filter",
      summary.receive_notifications === true,
    );
  }

  // Expect our inactive+notifications-enabled subscription to be present,
  // and active subscriptions to be absent.
  TestValidator.predicate(
    "subInactiveNoti should be present in false/true filter",
    idsFalseTrue.includes(subInactiveNoti.id),
  );
  TestValidator.predicate(
    "subActiveNoti should not be present in false/true filter",
    !idsFalseTrue.includes(subActiveNoti.id),
  );
  TestValidator.predicate(
    "subActiveNoNoti should not be present in false/true filter",
    !idsFalseTrue.includes(subActiveNoNoti.id),
  );

  // 7. Query with is_active=true, receive_notifications=false.
  const pageTrueFalseBody = {
    page: 0,
    limit: 20,
    order_by: "created_at",
    order_direction: "asc",
    is_active: true,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const pageTrueFalse: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.subscriptions.index(
      connection,
      { body: pageTrueFalseBody },
    );
  typia.assert(pageTrueFalse);

  TestValidator.predicate(
    "at least one subscription returned for is_active=true & receive_notifications=false",
    pageTrueFalse.data.length > 0,
  );

  const idsTrueFalse = collectIds(pageTrueFalse);

  for (const summary of pageTrueFalse.data) {
    TestValidator.predicate(
      "summary.receive_notifications must be false for true/false filter",
      summary.receive_notifications === false,
    );
  }

  TestValidator.predicate(
    "subActiveNoNoti should be present in true/false filter",
    idsTrueFalse.includes(subActiveNoNoti.id),
  );
  TestValidator.predicate(
    "subActiveNoti should not be present in true/false filter",
    !idsTrueFalse.includes(subActiveNoti.id),
  );
  TestValidator.predicate(
    "subInactiveNoti should not be present in true/false filter",
    !idsTrueFalse.includes(subInactiveNoti.id),
  );
}
