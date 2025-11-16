import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformDiscoveryFeedOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryFeedOnboarding";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryItem";

/**
 * Ensure onboarding discovery feed respects item status and time window.
 *
 * This E2E test verifies that PATCH
 * /communityPlatform/discovery/feeds/onboarding only surfaces discovery items
 * whose status is "active" and whose current time lies within the configured
 * [start_at, end_at) window, while ignoring items that are future-scheduled,
 * expired, or paused.
 *
 * Flow:
 *
 * 1. Register a memberUser and an adminUser via auth join endpoints.
 * 2. As memberUser, create a community, join it, and create a post.
 * 3. As adminUser, create multiple discovery items targeting that post with
 *    different combinations of status and time windows (visible, future,
 *    expired, paused).
 * 4. Call the onboarding discovery feed without authentication and verify that
 *    only the active, in-window item is present.
 * 5. Create a boundary-case discovery item whose start_at is exactly "now" and
 *    verify that it appears in a subsequent feed call, confirming inclusive
 *    handling of start_at and that the feed reflects latest persisted state.
 */
export async function test_api_discovery_onboarding_feed_respects_item_status_and_time_window(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Register adminUser
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPw123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Re-login as memberUser to ensure connection is using member auth
  const memberLoginBody = {
    identifier: memberJoinBody.username,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 3. As memberUser, create a community
  const communitySlug = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.name(),
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "created community slug should match request",
    community.slug,
    communityCreateBody.slug,
  );

  // 3b. Create membership for memberUser in this community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);
  TestValidator.equals(
    "membership community slug should match",
    membership.community.slug,
    community.slug,
  );

  // 3c. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);
  TestValidator.equals(
    "post community_id should match community.id",
    post.community_id,
    community.id,
  );

  // 4. As adminUser, create discovery items with different statuses/time windows
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  const now = new Date();
  const past = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const future = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead
  const farPast = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const farFuture = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Item A: active, current in window
  const discoveryItemABody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 100,
    start_at: farPast.toISOString(),
    end_at: farFuture.toISOString(),
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const itemA: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: discoveryItemABody },
    );
  typia.assert<ICommunityPlatformDiscoveryItem>(itemA);

  // Item B: active, future start
  const discoveryItemBBody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 90,
    start_at: future.toISOString(),
    end_at: farFuture.toISOString(),
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const itemB: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: discoveryItemBBody },
    );
  typia.assert<ICommunityPlatformDiscoveryItem>(itemB);

  // Item C: active, already expired
  const discoveryItemCBody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 80,
    start_at: farPast.toISOString(),
    end_at: past.toISOString(),
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const itemC: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: discoveryItemCBody },
    );
  typia.assert<ICommunityPlatformDiscoveryItem>(itemC);

  // Item D: paused, but in time window
  const discoveryItemDBody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 70,
    start_at: farPast.toISOString(),
    end_at: farFuture.toISOString(),
    status: "paused",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const itemD: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: discoveryItemDBody },
    );
  typia.assert<ICommunityPlatformDiscoveryItem>(itemD);

  // 5. Call onboarding feed without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const firstFeedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: null,
    locale: null,
    platform: null,
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const firstFeed: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      unauthConnection,
      { body: firstFeedRequestBody },
    );
  typia.assert<IPageICommunityPlatformDiscoveryItem.ISummary>(firstFeed);

  const firstIds = firstFeed.data.map((d) => d.id);
  const firstResourceIds = firstFeed.data.map((d) => d.resourceId);

  TestValidator.predicate(
    "onboarding feed should contain Item A's underlying resourceId",
    () => firstResourceIds.includes(itemA.target_id),
  );

  TestValidator.predicate(
    "onboarding feed should include a discovery item for Item A's ID",
    () => firstIds.includes(itemA.id),
  );

  TestValidator.predicate(
    "onboarding feed should not contain future-scheduled Item B",
    () => !firstIds.includes(itemB.id),
  );
  TestValidator.predicate(
    "onboarding feed should not contain expired Item C",
    () => !firstIds.includes(itemC.id),
  );
  TestValidator.predicate(
    "onboarding feed should not contain paused Item D",
    () => !firstIds.includes(itemD.id),
  );

  // 7. Boundary-case item E: start_at == now, end_at in future
  const boundaryStart = new Date();
  const boundaryEnd = new Date(boundaryStart.getTime() + 30 * 60 * 1000); // +30min

  const discoveryItemEBody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 95,
    start_at: boundaryStart.toISOString(),
    end_at: boundaryEnd.toISOString(),
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const itemE: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: discoveryItemEBody },
    );
  typia.assert<ICommunityPlatformDiscoveryItem>(itemE);

  const secondFeedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: null,
    locale: null,
    platform: null,
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const secondFeed: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      unauthConnection,
      { body: secondFeedRequestBody },
    );
  typia.assert<IPageICommunityPlatformDiscoveryItem.ISummary>(secondFeed);

  const secondIds = secondFeed.data.map((d) => d.id);
  const secondResourceIds = secondFeed.data.map((d) => d.resourceId);

  TestValidator.predicate(
    "boundary item E should be visible when start_at == now",
    () =>
      secondIds.includes(itemE.id) &&
      secondResourceIds.includes(itemE.target_id),
  );

  // Ensure that all discovery items in responses refer to the same post resource kind when applicable
  await TestValidator.predicate(
    "all returned discovery items should have resourceKind as non-empty string",
    async () => secondFeed.data.every((d) => d.resourceKind.length > 0),
  );
}
