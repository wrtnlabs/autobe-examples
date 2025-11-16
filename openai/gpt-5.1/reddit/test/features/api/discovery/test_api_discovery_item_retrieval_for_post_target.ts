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
 * Validate retrieval of a discovery item that promotes a community post.
 *
 * Business context: This test ensures that the public discovery read endpoint
 * can return a discovery item that has been configured by an adminUser to
 * promote a member-authored community post. The scenario exercises cross-actor
 * flows: a memberUser creates a community and post, an adminUser creates a
 * discovery item targeting that post, and finally an unauthenticated consumer
 * retrieves the discovery item by its ID.
 *
 * Steps:
 *
 * 1. Register an adminUser using /auth/adminUser/join.
 * 2. Register a memberUser using /auth/memberUser/join.
 * 3. As memberUser, create a community via
 *    /communityPlatform/memberUser/communities.
 * 4. As memberUser, join that community via
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 5. As memberUser, create a post in that community via
 *    /communityPlatform/memberUser/posts.
 * 6. Re-authenticate as adminUser using /auth/adminUser/login to ensure admin
 *    context for privileged operations.
 * 7. As adminUser, create a discovery item via
 *    /communityPlatform/adminUser/discovery/items targeting the post, with an
 *    active status and a time window covering the current time.
 * 8. From an unauthenticated connection, call
 *    /communityPlatform/discovery/items/{discoveryItemId} using the created
 *    discovery item's id.
 * 9. Assert that the retrieved discovery item matches the created one in all key
 *    business fields (id, target_type, target_id, context, priority_score,
 *    start_at, end_at, status, timestamps).
 */
export async function test_api_discovery_item_retrieval_for_post_target(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join) and remember credentials
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Adm1nP@ss!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Register memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Memb3rP@ss!",
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
      { body: communityBody },
    );
  typia.assert(community);

  // 4. As memberUser, create a membership in that community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 5. As memberUser, create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 6. Re-authenticate as adminUser to ensure admin context
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized = await api.functional.auth.adminUser.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoginAuthorized);

  // 7. As adminUser, create a discovery item targeting the post
  const now = new Date();
  const start = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const discoveryCreateBody = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 10,
    start_at: start,
    end_at: end,
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

  // 8. Use an unauthenticated connection to fetch discovery item
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const fetchedDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.discovery.items.at(
      publicConnection,
      {
        discoveryItemId: createdDiscovery.id,
      },
    );
  typia.assert(fetchedDiscovery);

  // 9. Compare key fields between created and fetched discovery items
  TestValidator.equals(
    "discovery id should match",
    fetchedDiscovery.id,
    createdDiscovery.id,
  );
  TestValidator.equals(
    "target_type should be 'post'",
    fetchedDiscovery.target_type,
    createdDiscovery.target_type,
  );
  TestValidator.equals(
    "target_id should match post id",
    fetchedDiscovery.target_id,
    createdDiscovery.target_id,
  );
  TestValidator.equals(
    "context should match",
    fetchedDiscovery.context,
    createdDiscovery.context,
  );
  TestValidator.equals(
    "priority_score should match",
    fetchedDiscovery.priority_score,
    createdDiscovery.priority_score,
  );
  TestValidator.equals(
    "start_at should match",
    fetchedDiscovery.start_at,
    createdDiscovery.start_at,
  );
  TestValidator.equals(
    "end_at should match",
    fetchedDiscovery.end_at,
    createdDiscovery.end_at,
  );
  TestValidator.equals(
    "status should match",
    fetchedDiscovery.status,
    createdDiscovery.status,
  );

  TestValidator.predicate(
    "created discovery priority_score should be positive",
    fetchedDiscovery.priority_score > 0,
  );
}
