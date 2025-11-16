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
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Create a discovery item for a post with a future activation window and a
 * non-active status.
 *
 * Business goal:
 *
 * - Ensure that an adminUser can create a discovery item targeting a memberUser
 *   post where the item is scheduled for the future (start_at in the future,
 *   end_at after start_at) and/or marked as non-active (e.g., "paused"), and
 *   that the creation API simply persists this configuration without enforcing
 *   feed-selection constraints.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser and obtain an authenticated member context.
 * 2. As memberUser, create a community with concrete visibility and posting flags.
 * 3. As memberUser, join the newly created community via memberships.create.
 * 4. As memberUser, create a post inside that community and capture its id.
 * 5. Register an adminUser and obtain an authenticated admin context.
 * 6. As adminUser, create a discovery item targeting the post with:
 *
 *    - Target_type = "post";
 *    - Target_id = created post.id;
 *    - Context = some discovery surface label (e.g., "home_feed");
 *    - Priority_score = a positive number;
 *    - Start_at = now + 1 day;
 *    - End_at = start_at + 2 days;
 *    - Status = "paused" (representing a non-active state).
 * 7. Validate that the response ICommunityPlatformDiscoveryItem matches the
 *    requested parameters and that timestamps form a sane window (start_at <
 *    end_at and start_at > now).
 */
export async function test_api_discovery_item_creation_with_inactive_status_and_future_window(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as this memberUser
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug should match request",
    community.slug,
    communitySlug,
  );

  // 3. Create a membership in that community for the memberUser
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
  typia.assert(membership);

  TestValidator.equals(
    "membership community slug should match",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id should match created community id",
    post.community_id,
    community.id,
  );

  // 5. Register adminUser and obtain admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. As adminUser, create a discovery item targeting the post with future window & paused status
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
  const endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days

  const requestedStartAt = startDate.toISOString();
  const requestedEndAt = endDate.toISOString();
  const requestedContext = "home_feed";
  const requestedStatus = "paused";
  const requestedPriority = 10.5;

  const discoveryCreateBody = {
    target_type: "post",
    target_id: post.id,
    context: requestedContext,
    priority_score: requestedPriority,
    start_at: requestedStartAt,
    end_at: requestedEndAt,
    status: requestedStatus,
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const discoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert(discoveryItem);

  // 7. Validate discovery item fields match the request
  TestValidator.equals(
    "discovery.target_type should be 'post'",
    discoveryItem.target_type,
    "post",
  );
  TestValidator.equals(
    "discovery.target_id should match post.id",
    discoveryItem.target_id,
    post.id,
  );
  TestValidator.equals(
    "discovery.context should match",
    discoveryItem.context ?? undefined,
    requestedContext,
  );
  TestValidator.equals(
    "discovery.priority_score should match",
    discoveryItem.priority_score,
    requestedPriority,
  );
  TestValidator.equals(
    "discovery.status should match",
    discoveryItem.status,
    requestedStatus,
  );

  TestValidator.predicate(
    "start_at should not be null or undefined",
    () =>
      discoveryItem.start_at !== null && discoveryItem.start_at !== undefined,
  );
  TestValidator.predicate(
    "end_at should not be null or undefined",
    () => discoveryItem.end_at !== null && discoveryItem.end_at !== undefined,
  );

  if (discoveryItem.start_at !== null && discoveryItem.start_at !== undefined) {
    TestValidator.equals(
      "start_at should match requestedStartAt",
      discoveryItem.start_at,
      requestedStartAt,
    );
  }
  if (discoveryItem.end_at !== null && discoveryItem.end_at !== undefined) {
    TestValidator.equals(
      "end_at should match requestedEndAt",
      discoveryItem.end_at,
      requestedEndAt,
    );
  }

  // Temporal sanity checks: start_at < end_at and start_at > now
  if (
    discoveryItem.start_at !== null &&
    discoveryItem.start_at !== undefined &&
    discoveryItem.end_at !== null &&
    discoveryItem.end_at !== undefined
  ) {
    const parsedStart = new Date(discoveryItem.start_at).getTime();
    const parsedEnd = new Date(discoveryItem.end_at).getTime();
    const nowMs = now.getTime();

    TestValidator.predicate(
      "start_at should be before end_at",
      parsedStart < parsedEnd,
    );
    TestValidator.predicate(
      "start_at should be in the future relative to now",
      parsedStart > nowMs,
    );
  }

  TestValidator.predicate(
    "deleted_at should be null or undefined (not soft-deleted)",
    () =>
      discoveryItem.deleted_at === null ||
      discoveryItem.deleted_at === undefined,
  );
}
