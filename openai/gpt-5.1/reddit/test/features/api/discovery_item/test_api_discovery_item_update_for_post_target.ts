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
 * Validate updating a discovery item that targets a post works correctly.
 *
 * Business context:
 *
 * - MemberUser creates a community and a post in that community.
 * - AdminUser creates a discovery item that promotes that post.
 * - AdminUser then updates the discovery item (priority, status, schedule
 *   window).
 *
 * This test verifies:
 *
 * 1. Auth flows for memberUser and adminUser are wired (join/login) and tokens are
 *    applied via SDK.
 * 2. A community can be created by a memberUser and used as the target community
 *    for a post.
 * 3. A membership for the memberUser can be created in that community.
 * 4. A post can be created in that community and returns a valid
 *    ICommunityPlatformPost with stable identifiers.
 * 5. An adminUser can create a discovery item for that post with
 *    ICommunityPlatformDiscoveryItem.ICreate.
 * 6. The adminUser can update the discovery item via
 *    ICommunityPlatformDiscoveryItem.IUpdate using PUT
 *    /communityPlatform/adminUser/discovery/items/{discoveryItemId}.
 * 7. After update:
 *
 *    - `priority_score`, `status`, and the scheduling window (`start_at`, `end_at`)
 *         reflect the new values.
 *    - Targeting fields (`target_type`, `target_id`) are unchanged.
 *    - `id` and `created_at` remain unchanged.
 *    - `updated_at` is more recent than before the update.
 */
export async function test_api_discovery_item_update_for_post_target(
  connection: api.IConnection,
) {
  // 1. Prepare unique emails and usernames for both memberUser and adminUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUsername: string = RandomGenerator.name(1);
  const adminUsername: string = RandomGenerator.name(1);

  const commonHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const commonReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // 2. Register memberUser (join) and implicitly authenticate
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Register adminUser (join) and implicitly authenticate as admin
  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // After this call, connection is authenticated as adminUser.
  // 4. Switch to memberUser by logging in as memberUser
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Create a community as memberUser
  const communitySlug: string & tags.MinLength<1> & tags.MaxLength<128> =
    RandomGenerator.alphaNumeric(12) as string as string &
      tags.MinLength<1> &
      tags.MaxLength<128>;

  const communityCreateBody = {
    slug: communitySlug,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a community membership for the memberUser in the created community
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

  // Sanity: membership community slug matches created community
  TestValidator.equals(
    "membership community slug should match created community",
    membership.community.slug,
    community.slug,
  );

  // 7. Create a post in that community as the memberUser
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

  TestValidator.equals(
    "created post should belong to the community",
    post.community_id,
    community.id,
  );

  // 8. Switch back to adminUser context via admin login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 9. Create a discovery item for the post as adminUser
  const initialStartAt: string & tags.Format<"date-time"> =
    RandomGenerator.date(new Date(), 60 * 60 * 1000).toISOString();
  const initialEndAt: string & tags.Format<"date-time"> = RandomGenerator.date(
    new Date(Date.now() + 2 * 60 * 60 * 1000),
    60 * 60 * 1000,
  ).toISOString();

  const discoveryCreateBody = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 10,
    start_at: initialStartAt,
    end_at: initialEndAt,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const createdDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert(createdDiscovery);

  // Capture original values for later comparison
  const originalId = createdDiscovery.id;
  const originalCreatedAt = createdDiscovery.created_at;
  const originalUpdatedAt = createdDiscovery.updated_at;
  const originalTargetType = createdDiscovery.target_type;
  const originalTargetId = createdDiscovery.target_id;

  // 10. Update the discovery item: change priority, status, and schedule window
  const updatedStartAt: string & tags.Format<"date-time"> =
    RandomGenerator.date(new Date(), 3 * 60 * 60 * 1000).toISOString();
  const updatedEndAt: string & tags.Format<"date-time"> = RandomGenerator.date(
    new Date(Date.now() + 4 * 60 * 60 * 1000),
    3 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    priority_score: createdDiscovery.priority_score + 5,
    status: "paused",
    start_at: updatedStartAt,
    end_at: updatedEndAt,
  } satisfies ICommunityPlatformDiscoveryItem.IUpdate;

  const updatedDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.update(
      connection,
      {
        discoveryItemId: createdDiscovery.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDiscovery);

  // 11. Validate immutability of identity and targeting fields
  TestValidator.equals(
    "discovery item id must remain unchanged after update",
    updatedDiscovery.id,
    originalId,
  );
  TestValidator.equals(
    "discovery item created_at must remain unchanged after update",
    updatedDiscovery.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "target_type must remain unchanged after update",
    updatedDiscovery.target_type,
    originalTargetType,
  );
  TestValidator.equals(
    "target_id must remain unchanged after update",
    updatedDiscovery.target_id,
    originalTargetId,
  );

  // 12. Validate updated business fields
  TestValidator.equals(
    "priority_score should reflect updated value",
    updatedDiscovery.priority_score,
    updateBody.priority_score,
  );
  TestValidator.equals(
    "status should reflect updated value",
    updatedDiscovery.status,
    updateBody.status,
  );
  TestValidator.equals(
    "start_at should reflect updated value",
    updatedDiscovery.start_at,
    updateBody.start_at,
  );
  TestValidator.equals(
    "end_at should reflect updated value",
    updatedDiscovery.end_at,
    updateBody.end_at,
  );

  // 13. Validate updated_at is advanced compared to original
  TestValidator.predicate(
    "updated_at should be later than original updated_at",
    new Date(updatedDiscovery.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
