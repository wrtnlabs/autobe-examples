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
 * Verify that only adminUser actors can update discovery items.
 *
 * Business goal:
 *
 * - Ensure that the PUT
 *   /communityPlatform/adminUser/discovery/items/{discoveryItemId} endpoint
 *   enforces admin-only authorization even when a memberUser sends a
 *   syntactically valid ICommunityPlatformDiscoveryItem.IUpdate payload.
 * - Demonstrate that valid payloads fail solely due to actor role when executed
 *   under a memberUser token, and succeed under adminUser token.
 *
 * High-level flow:
 *
 * 1. Bootstrap two actors: an adminUser and a memberUser.
 * 2. As memberUser, create a community and a post inside that community.
 * 3. As adminUser, create a discovery item targeting the memberUser’s post.
 * 4. As memberUser, attempt to update the discovery item and expect an error.
 * 5. As adminUser, perform the same update and expect success.
 *
 * Implementation notes:
 *
 * - Use auth.*.join/login endpoints to flip the Authorization context on the
 *   shared `connection` object. Never mutate connection.headers manually.
 * - Use realistic payloads that conform to ICommunityPlatform* DTOs.
 * - Validate all successful responses with typia.assert().
 * - Use TestValidator.error() to assert the memberUser update fails (without
 *   checking specific HTTP status codes).
 * - Use TestValidator.equals()/predicate() for business assertions where
 *   appropriate.
 */
export async function test_api_discovery_item_update_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Create adminUser via join (admin token will be stored in connection by SDK)
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmailLocal: string = RandomGenerator.alphabets(8);
  const adminEmail: string = `${adminEmailLocal}@admin.example.com`;

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create memberUser via join (member token overwrites Authorization header)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmailLocal: string = RandomGenerator.alphabets(8);
  const memberEmail: string = `${memberEmailLocal}@member.example.com`;

  const memberJoinBody = {
    username: memberUsername as string & tags.MinLength<3> & tags.MaxLength<32>,
    email: memberEmail as string & tags.Format<"email">,
    password: "MemberPassw0rd!" as string & tags.MinLength<8>,
    ip: null,
    href: "https://member.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 3. As memberUser, create a community
  const communitySlug: string = RandomGenerator.alphabets(10);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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
  typia.assert(community);

  // 4. As memberUser, join the community and create a post
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

  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Switch back to adminUser via login to create the discovery item
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/console" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  const now: Date = new Date();
  const startAtIso: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;
  const endAtIso: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const discoveryCreateBody = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 10,
    start_at: startAtIso,
    end_at: endAtIso,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const discoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: discoveryCreateBody },
    );
  typia.assert(discoveryItem);

  // Prepare update payload that changes some fields
  const updatedPriorityScore = 20;
  const updatedStatus = "paused";
  const updatedContext = "home_feed_top";
  const updatedStartAtIso: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const updatedEndAtIso: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const discoveryUpdateBody = {
    // Keep target_type/target_id aligned with creation
    target_type: discoveryItem.target_type,
    target_id: discoveryItem.target_id,
    context: updatedContext,
    priority_score: updatedPriorityScore,
    start_at: updatedStartAtIso,
    end_at: updatedEndAtIso,
    status: updatedStatus,
  } satisfies ICommunityPlatformDiscoveryItem.IUpdate;

  // 6. Switch to memberUser context via login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/feed" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 7. Attempt to update discovery item as memberUser, expecting authorization error
  await TestValidator.error(
    "memberUser cannot update admin-only discovery item",
    async () => {
      await api.functional.communityPlatform.adminUser.discovery.items.update(
        connection,
        {
          discoveryItemId: discoveryItem.id,
          body: discoveryUpdateBody,
        },
      );
    },
  );

  // 8. Switch back to adminUser and perform the update, expecting success
  const adminAuthorizedFromLoginAgain: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLoginAgain);

  const updatedDiscoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.update(
      connection,
      {
        discoveryItemId: discoveryItem.id,
        body: discoveryUpdateBody,
      },
    );
  typia.assert(updatedDiscoveryItem);

  // 9. Business assertions
  TestValidator.equals(
    "admin update must change target fields as requested",
    updatedDiscoveryItem.target_id,
    discoveryItem.target_id,
  );
  TestValidator.equals(
    "context updated by admin",
    updatedDiscoveryItem.context,
    updatedContext,
  );
  TestValidator.equals(
    "priority_score updated by admin",
    updatedDiscoveryItem.priority_score,
    updatedPriorityScore,
  );
  TestValidator.equals(
    "status updated by admin",
    updatedDiscoveryItem.status,
    updatedStatus,
  );
  TestValidator.equals(
    "start_at updated by admin",
    updatedDiscoveryItem.start_at,
    updatedStartAtIso,
  );
  TestValidator.equals(
    "end_at updated by admin",
    updatedDiscoveryItem.end_at,
    updatedEndAtIso,
  );

  TestValidator.predicate(
    "discovery item id remains the same after updates",
    updatedDiscoveryItem.id === discoveryItem.id,
  );
}
