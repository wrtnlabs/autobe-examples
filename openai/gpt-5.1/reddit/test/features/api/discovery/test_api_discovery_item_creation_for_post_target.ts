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
 * Create a discovery item for a community post and validate its core fields.
 *
 * Business goal
 *
 * - Ensure that an administrator can promote a specific community post into the
 *   discovery inventory using POST
 *   /communityPlatform/adminUser/discovery/items.
 * - Validate that required relationships (community, membership, post) exist
 *   before creating the discovery item and that the creation response matches
 *   the requested payload plus system-generated metadata.
 *
 * High-level workflow
 *
 * 1. Create an adminUser account via /auth/adminUser/join and keep its credentials
 *    for later re-login.
 * 2. Create a memberUser account via /auth/memberUser/join and keep its
 *    credentials for further content operations.
 * 3. As the memberUser, create a community using
 *    api.functional.communityPlatform.memberUser.communities.create with a
 *    valid ICommunityPlatformCommunity.ICreate body (slug, name, description,
 *    visibility, status, nsfw/quarantine flags, and posting flags).
 * 4. As the same memberUser, create a membership in that community via
 *    api.functional.communityPlatform.memberUser.communities.memberships.create
 *    using the community.slug, with an
 *    ICommunityPlatformCommunityMembership.ICreate body that at least sets role
 *    (e.g., "member") and relies on server defaults for approval/banned flags.
 * 5. Still as memberUser, create a post using
 *    api.functional.communityPlatform.memberUser.posts.create with an
 *    ICommunityPlatformPost.ICreate payload whose communityId/communityCode
 *    align with the created community, plus a title and optional body/url and
 *    postType.
 * 6. Switch back to the adminUser actor by calling
 *    api.functional.auth.adminUser.login with the stored admin credentials to
 *    ensure the Authorization header represents an adminUser.
 * 7. As adminUser, call
 *    api.functional.communityPlatform.adminUser.discovery.items.create with an
 *    ICommunityPlatformDiscoveryItem.ICreate payload that:
 *
 *    - Target_type is a string describing that the target is a post (for example,
 *         "post").
 *    - Target_id is the post.id from step 5.
 *    - Context is a string like "home_feed".
 *    - Priority_score is a positive number (for example, 10.5).
 *    - Start_at is an ISO date-time string slightly in the past or now.
 *    - End_at is an ISO date-time string in the near future after start_at.
 *    - Status is an active-like string, such as "active".
 * 8. Validate the response:
 *
 *    - Use typia.assert<ICommunityPlatformDiscoveryItem>(...) to enforce schema
 *         correctness.
 *    - Use TestValidator.equals to ensure:
 *
 *         - Response.target_type equals the requested target_type.
 *         - Response.target_id equals the post.id.
 *         - Response.context equals the requested context (handling undefined
 *                   consistently with the request).
 *         - Response.priority_score equals the requested priority_score.
 *         - Response.status equals the requested status.
 *    - Use TestValidator.predicate to confirm:
 *
 *         - Start_at and end_at are not null/undefined (when they were supplied).
 *         - Created_at and updated_at are non-empty ISO strings.
 *         - Deleted_at is null or undefined immediately after creation, meaning the item
 *                   is not soft-deleted.
 *
 * Simplifications and constraints
 *
 * - There is no GET /communityPlatform/discovery/items/{id} SDK in the provided
 *   list, so we restrict validations to the creation response only, instead of
 *   re-fetching the discovery item.
 * - We avoid any negative or type-error scenarios and only test the happy path
 *   with well-typed inputs.
 */
export async function test_api_discovery_item_creation_for_post_target(
  connection: api.IConnection,
) {
  // 1. Create an adminUser account via join and preserve credentials
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "Adm1nP@ssword";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoinOutput: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Create a memberUser account via join and preserve credentials
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = `member+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = "MemberP@ss1";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinOutput);

  // 3. As memberUser, create a community
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
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
    "community slug should match creation request",
    community.slug,
    communitySlug,
  );

  // 4. As memberUser, create a membership in that community
  const membershipCreateBody = {
    role: "member",
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
    "membership community slug should match community.slug",
    membership.community.slug,
    community.slug,
  );

  // 5. Still as memberUser, create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id should match community.id",
    post.community_id,
    community.id,
  );

  // 6. Switch back to adminUser actor by logging in with stored credentials
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginOutput: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 7. As adminUser, create a discovery item targeting the created post
  const targetType = "post";
  const discoveryContext = "home_feed";
  const priorityScore = 10.5;

  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const discoveryCreateBody = {
    target_type: targetType,
    target_id: post.id,
    context: discoveryContext,
    priority_score: priorityScore,
    start_at: startAt,
    end_at: endAt,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const discoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert(discoveryItem);

  // 8. Validate core fields of the created discovery item
  TestValidator.equals(
    "discovery item target_type should equal requested target_type",
    discoveryItem.target_type,
    targetType,
  );
  TestValidator.equals(
    "discovery item target_id should equal post.id",
    discoveryItem.target_id,
    post.id,
  );
  TestValidator.equals(
    "discovery item context should equal requested context",
    discoveryItem.context,
    discoveryContext,
  );
  TestValidator.equals(
    "discovery item priority_score should equal requested priority_score",
    discoveryItem.priority_score,
    priorityScore,
  );
  TestValidator.equals(
    "discovery item status should equal requested status",
    discoveryItem.status,
    discoveryCreateBody.status,
  );

  TestValidator.predicate(
    "discovery item start_at should be defined when provided",
    discoveryItem.start_at !== null && discoveryItem.start_at !== undefined,
  );
  TestValidator.predicate(
    "discovery item end_at should be defined when provided",
    discoveryItem.end_at !== null && discoveryItem.end_at !== undefined,
  );

  TestValidator.predicate(
    "discovery item created_at should be a non-empty string",
    typeof discoveryItem.created_at === "string" &&
      discoveryItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "discovery item updated_at should be a non-empty string",
    typeof discoveryItem.updated_at === "string" &&
      discoveryItem.updated_at.length > 0,
  );

  TestValidator.predicate(
    "discovery item deleted_at should be null or undefined after creation",
    discoveryItem.deleted_at === null || discoveryItem.deleted_at === undefined,
  );
}
