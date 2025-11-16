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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryItem";

export async function test_api_discovery_items_respects_time_window(
  connection: api.IConnection,
) {
  // 1. Create a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. Create an admin user (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}-admin@example.com`,
    password: "AdminPass123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // 3. As member user (current token is memberUser from join), create a community
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.name(2),
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

  // 4. Create membership for the member user in that community
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

  // 5. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Switch to admin user context (login not strictly required but do it to be explicit)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Create three discovery items (A, B, C) for the same post with different time windows
  const context = "home_feed";
  const now = new Date();
  const past10 = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const past20 = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  const future10 = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  // Item A: active now (start in past, end in future)
  const itemABody = {
    target_type: "post",
    target_id: post.id,
    context,
    priority_score: 10,
    start_at: past10,
    end_at: future10,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;
  const itemA: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: itemABody },
    );
  typia.assert(itemA);

  // Item B: not yet active (start in future, no end_at)
  const itemBBody = {
    target_type: "post",
    target_id: post.id,
    context,
    priority_score: 20,
    start_at: future10,
    end_at: undefined,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;
  const itemB: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: itemBBody },
    );
  typia.assert(itemB);

  // Item C: already expired (start in past, end in past)
  const itemCBody = {
    target_type: "post",
    target_id: post.id,
    context,
    priority_score: 5,
    start_at: past20,
    end_at: past10,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;
  const itemC: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      { body: itemCBody },
    );
  typia.assert(itemC);

  // 8. Call discovery search with status="active" and matching context
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: "active",
    context,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformDiscoveryItem.IRequest;
  const pageResult: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.items.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  // 9. Extract ids from discovery item summaries and assert time window behavior
  const discoveredIds = pageResult.data.map((summary) => summary.id);

  TestValidator.predicate(
    "discovery search should include only the active window item A",
    discoveredIds.includes(itemA.id),
  );
  TestValidator.predicate(
    "discovery search should not include future item B outside start_at window",
    !discoveredIds.includes(itemB.id),
  );
  TestValidator.predicate(
    "discovery search should not include expired item C past end_at window",
    !discoveredIds.includes(itemC.id),
  );
}
