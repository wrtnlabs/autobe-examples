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
 * Validate soft deletion of a discovery item targeting a post by an adminUser.
 *
 * Business flow:
 *
 * 1. Register an adminUser and establish admin authentication.
 * 2. Register a memberUser and switch authentication to that member.
 * 3. As memberUser, create a community and join it as a member.
 * 4. As memberUser, create a post inside that community.
 * 5. Switch back to adminUser via explicit login.
 * 6. As adminUser, create a discovery item targeting the created post.
 * 7. As adminUser, call DELETE
 *    /communityPlatform/adminUser/discovery/items/{discoveryItemId}.
 * 8. Assert that the returned discovery item is soft-deleted: deleted_at becomes
 *    non-null and status changes from its original value, while identity fields
 *    remain stable.
 */
export async function test_api_discovery_item_soft_delete_for_post_target(
  connection: api.IConnection,
) {
  // 1. AdminUser registration (join) to obtain initial admin context
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Adm1n!" + RandomGenerator.alphaNumeric(6);

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

  // 2. MemberUser registration (join)
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "Mem1ber!" + RandomGenerator.alphaNumeric(4);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinOutput);

  // 3. Create a community as memberUser
  const communitySlug: string = `community-${RandomGenerator.alphaNumeric(8)}`;
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
  typia.assert(community);

  TestValidator.equals(
    "created community slug should match request",
    community.slug,
    communitySlug,
  );

  // 4. Join the community as a member
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
    "membership community id should match created community",
    membership.community.id,
    community.id,
  );

  // 5. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post should belong to the created community",
    post.community_id,
    community.id,
  );

  // 6. Switch back to adminUser context using explicit login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginOutput: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  TestValidator.equals(
    "logged in admin id should match joined admin id",
    adminLoginOutput.id,
    adminJoinOutput.id,
  );

  // 7. Create a discovery item targeting the created post
  const now: Date = new Date();
  const startAt: string = now.toISOString();
  const endAt: string = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const discoveryCreateBody = {
    target_type: "post",
    target_id: post.id,
    context: "home_feed",
    priority_score: 10,
    start_at: startAt,
    end_at: endAt,
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

  TestValidator.equals(
    "discovery item should target the created post",
    createdDiscovery.target_id,
    post.id,
  );

  TestValidator.predicate(
    "created discovery item should not be soft-deleted initially",
    createdDiscovery.deleted_at === null ||
      createdDiscovery.deleted_at === undefined,
  );

  // 8. Soft delete the discovery item via DELETE
  const deletedDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.erase(
      connection,
      {
        discoveryItemId: createdDiscovery.id,
      },
    );
  typia.assert(deletedDiscovery);

  // 9. Validate soft delete semantics
  TestValidator.equals(
    "deleted discovery item id should be same as created",
    deletedDiscovery.id,
    createdDiscovery.id,
  );

  TestValidator.equals(
    "deleted discovery item target_type should remain unchanged",
    deletedDiscovery.target_type,
    createdDiscovery.target_type,
  );

  TestValidator.equals(
    "deleted discovery item target_id should remain unchanged",
    deletedDiscovery.target_id,
    createdDiscovery.target_id,
  );

  TestValidator.equals(
    "deleted discovery item context should remain unchanged",
    deletedDiscovery.context,
    createdDiscovery.context,
  );

  TestValidator.predicate(
    "deleted discovery item must have non-null deleted_at",
    deletedDiscovery.deleted_at !== null &&
      deletedDiscovery.deleted_at !== undefined,
  );

  TestValidator.notEquals(
    "status after delete should differ from initial status",
    deletedDiscovery.status,
    createdDiscovery.status,
  );
}
