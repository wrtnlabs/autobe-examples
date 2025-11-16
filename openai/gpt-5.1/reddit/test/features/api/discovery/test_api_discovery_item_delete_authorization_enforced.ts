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
 * Ensure that logical deletion of discovery items is restricted to adminUser
 * actors.
 *
 * Business goal:
 *
 * - Member users must not be able to delete discovery items through the
 *   admin-only DELETE
 *   /communityPlatform/adminUser/discovery/items/{discoveryItemId} endpoint.
 * - Admin users must be able to delete discovery items successfully, resulting in
 *   a soft delete (deleted_at populated).
 *
 * Scenario steps:
 *
 * 1. Create a memberUser account (join) and keep its credentials for later login.
 * 2. Create an adminUser account (join) and keep its credentials for later login.
 * 3. Using memberUser context: 3-1. Create a community. 3-2. Join the community as
 *    a member. 3-3. Create a post in that community.
 * 4. Switch to adminUser context and create a discovery item targeting the post.
 * 5. Switch back to memberUser context and attempt to DELETE the discovery item.
 *
 *    - Expect an authorization error and assert using TestValidator.error, without
 *         asserting any particular status code.
 * 6. Switch again to adminUser context and perform DELETE on the same discovery
 *    item.
 *
 *    - Expect success and verify the returned discovery item has deleted_at set.
 */
export async function test_api_discovery_item_delete_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Keep member credentials
  const memberIdentifier: string = memberJoinBody.username;
  const memberPassword: string = memberJoinBody.password;

  // 2. Register an adminUser (join)
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminIdentifier: string = adminJoinBody.username;
  const adminPassword: string = adminJoinBody.password;

  // 3. Ensure we are in memberUser context by logging in explicitly
  const memberLoginBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 3-1. Create a community as memberUser
  const communityCreateBody = {
    slug: `community_${RandomGenerator.alphabets(10)}`,
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

  // 3-2. Join the community as member
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

  // 3-3. Create a post in the community
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
  typia.assert(post);

  // 4. Switch to adminUser context (login) and create discovery item
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  const discoveryCreateBody = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 100,
    start_at: undefined,
    end_at: undefined,
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

  // 5. Switch back to memberUser context and attempt unauthorized delete
  const memberLoginAgainBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAgainResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginAgainBody,
    });
  typia.assert(memberLoginAgainResult);

  await TestValidator.error(
    "memberUser must not be able to delete discovery items",
    async () => {
      await api.functional.communityPlatform.adminUser.discovery.items.erase(
        connection,
        {
          discoveryItemId: discoveryItem.id,
        },
      );
    },
  );

  // 6. Switch again to adminUser context
  const adminLoginAgainBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAgainResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert(adminLoginAgainResult);

  // 7. Perform authorized delete and verify logical deletion
  const erased: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.erase(
      connection,
      {
        discoveryItemId: discoveryItem.id,
      },
    );
  typia.assert(erased);

  TestValidator.predicate(
    "deleted_at must be populated after adminUser deletion",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );
}
