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

/**
 * Validate discovery items pagination, sorting, and status filtering behavior.
 *
 * Business goal
 *
 * - Ensure PATCH /communityPlatform/discovery/items returns a correctly paginated
 *   and sorted list of discovery items when items exist for different target
 *   types (communities and posts).
 * - Confirm that status filter (status = "active") and ordering by priority_score
 *   desc are respected so that feeds/dashboards can rely on stable discovery
 *   inventory behavior.
 *
 * Scenario overview
 *
 * 1. Create an adminUser account (admin discovery manager).
 * 2. Create a memberUser account (content author whose communities/posts will be
 *    promoted via discovery).
 * 3. As the memberUser, create two communities.
 * 4. As the memberUser, join each community (memberships) to satisfy posting
 *    permissions.
 * 5. As the memberUser, create multiple posts across those communities.
 * 6. As the adminUser, create a mix of discovery items targeting both communities
 *    and posts with varying priority_score and status.
 * 7. Call the discovery search endpoint with pagination + sorting parameters and a
 *    status filter of "active".
 * 8. Validate pagination metadata, ordering by priority_score desc, and that only
 *    active items appear and correspond to known targets.
 */
export async function test_api_discovery_items_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register adminUser (auto-auth as admin via SDK)
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "AdminPassw0rd!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register memberUser (auto-auth as member via SDK)
  const memberUsername = RandomGenerator.name(1).replace(/\s+/g, "");
  const memberEmail =
    `member_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const memberPassword = "MemberPassw0rd!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create two communities
  const community1Slug = `community_${RandomGenerator.alphaNumeric(6)}`;
  const community2Slug = `community_${RandomGenerator.alphaNumeric(6)}`;

  const community1CreateBody = {
    slug: community1Slug,
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

  const community2CreateBody = {
    slug: community2Slug,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community1CreateBody },
    );
  typia.assert(community1);

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community2CreateBody },
    );
  typia.assert(community2);

  // 4. Join both communities (memberships) as memberUser
  const membershipRole = "member";

  const membershipCreateBody = {
    role: membershipRole,
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership1: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community1.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership1);

  const membership2: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community2.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership2);

  // 5. Create multiple posts across both communities
  const createTextPostBody = (
    community: ICommunityPlatformCommunity,
  ): ICommunityPlatformPost.ICreate =>
    ({
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
      url: undefined,
      postType: "text",
    }) satisfies ICommunityPlatformPost.ICreate;

  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: createTextPostBody(community1),
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: createTextPostBody(community1),
    });
  typia.assert(post2);

  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: createTextPostBody(community2),
    });
  typia.assert(post3);

  // 6. Switch back to adminUser explicitly via login (ensures admin token)
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Prepare discovery items: mix of active and paused across posts & communities
  type LocalDiscoveryRef = {
    id: string & tags.Format<"uuid">;
    target: ICommunityPlatformDiscoveryItem;
  };

  const createdActiveItems: ICommunityPlatformDiscoveryItem[] = [];
  const createdPausedItems: ICommunityPlatformDiscoveryItem[] = [];

  const nowIso = new Date().toISOString();

  const createDiscoveryItem = async (
    target_type: string,
    target_id: string,
    priority_score: number,
    status: string,
  ): Promise<ICommunityPlatformDiscoveryItem> => {
    const body = {
      target_type,
      target_id,
      context: "home_feed",
      priority_score,
      start_at: nowIso,
      end_at: undefined,
      status,
    } satisfies ICommunityPlatformDiscoveryItem.ICreate;

    const item: ICommunityPlatformDiscoveryItem =
      await api.functional.communityPlatform.adminUser.discovery.items.create(
        connection,
        { body },
      );
    typia.assert(item);
    return item;
  };

  // Create at least 6 items with clear priority ordering
  const item1 = await createDiscoveryItem(
    "community",
    community1.id,
    10,
    "active",
  );
  createdActiveItems.push(item1);

  const item2 = await createDiscoveryItem(
    "community",
    community2.id,
    20,
    "active",
  );
  createdActiveItems.push(item2);

  const item3 = await createDiscoveryItem("post", post1.id, 30, "active");
  createdActiveItems.push(item3);

  const item4 = await createDiscoveryItem("post", post2.id, 40, "paused");
  createdPausedItems.push(item4);

  const item5 = await createDiscoveryItem("post", post3.id, 50, "active");
  createdActiveItems.push(item5);

  const item6 = await createDiscoveryItem(
    "community",
    community1.id,
    60,
    "active",
  );
  createdActiveItems.push(item6);

  // Sanity: active items count should be >= 4
  TestValidator.predicate(
    "created active discovery items count >= 4",
    createdActiveItems.length >= 4,
  );

  // 7. Call discovery index with pagination, sorting, and status filter
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const indexRequestBody = {
    page,
    limit,
    status: "active",
    context: "home_feed",
    orderBy: "priority_score",
    orderDirection: "desc",
  } satisfies ICommunityPlatformDiscoveryItem.IRequest;

  const pageResult: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.items.index(connection, {
      body: indexRequestBody,
    });
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 8. Basic pagination validations
  TestValidator.equals(
    "pagination.current equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records is non-negative and >= data length",
    pagination.records >= 0 && pagination.records >= pageResult.data.length,
  );

  TestValidator.predicate(
    "pagination.pages is at least 1 when any records exist",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  TestValidator.predicate(
    "page data length is at most the requested limit",
    pageResult.data.length <= limit,
  );

  // 9. Verify sorting by priority_score desc and active-only filter
  // Build a map from discovery item id to full entity so that we can inspect priority_score and status.
  const allCreatedItems: ICommunityPlatformDiscoveryItem[] = [
    ...createdActiveItems,
    ...createdPausedItems,
  ];

  const entityById = new Map<string, ICommunityPlatformDiscoveryItem>();
  for (const entity of allCreatedItems) entityById.set(entity.id, entity);

  // Ensure all returned summaries correspond to active items we created
  TestValidator.predicate(
    "all returned discovery summaries correspond to active entities we created",
    pageResult.data.every((summary) => {
      const entity = entityById.get(summary.id);
      return !!entity && entity.status === "active";
    }),
  );

  // Ensure none of the paused items appear in result
  const pausedIds = new Set(createdPausedItems.map((i) => i.id));
  TestValidator.predicate(
    "no paused discovery items are returned",
    pageResult.data.every((summary) => !pausedIds.has(summary.id)),
  );

  // Ensure summary resourceKind/resourceId are coherent with underlying items
  TestValidator.predicate(
    "summary resourceId matches underlying discovery target_id",
    pageResult.data.every((summary) => {
      const entity = entityById.get(summary.id);
      if (!entity) return false;
      return summary.resourceId === entity.target_id;
    }),
  );

  // Sorting by priority_score desc across active items that appear in this page
  const returnedEntities: ICommunityPlatformDiscoveryItem[] = pageResult.data
    .map((summary) => entityById.get(summary.id))
    .filter((e): e is ICommunityPlatformDiscoveryItem => !!e);

  const sortedByPriorityDesc = [...returnedEntities].sort(
    (a, b) => b.priority_score - a.priority_score,
  );

  TestValidator.equals(
    "returned discovery items are sorted by priority_score desc",
    returnedEntities.map((e) => e.id),
    sortedByPriorityDesc.map((e) => e.id),
  );
}
