import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusHistory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Admin can retrieve a detailed community status history record.
 *
 * End-to-end flow (adapted to available APIs and simulator behavior):
 *
 * 1. Register a memberUser and obtain an authenticated session.
 * 2. As that memberUser, create a community with a unique slug.
 * 3. As that memberUser, create a post in the created community to simulate real
 *    activity.
 * 4. Register an adminUser and obtain an authenticated admin session.
 * 5. As the adminUser, call the status history detail endpoint GET
 *    /communityPlatform/adminUser/communities/{communitySlug}/statusHistories/{statusHistoryId}
 *    using the created community's slug and a random statusHistoryId.
 * 6. Assert that the response is a well-typed
 *    ICommunityPlatformCommunityStatusHistory object, and perform light
 *    business invariants that do not depend on concrete database fixtures
 *    (non-empty community slug, non-empty newVisibility/newStatus, createdAt
 *    present).
 *
 * Notes:
 *
 * - Because there is no API to create or query concrete status history rows, this
 *   test does not attempt to correlate the requested path parameters with the
 *   returned record; instead it focuses on exercising the endpoint under an
 *   authenticated admin context and validating the shape of the payload.
 */
export async function test_api_admin_community_status_history_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. memberUser join
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
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

  // 2. create community as memberUser
  const communitySlug: string = `comm-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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

  // 3. create a post in that community
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

  // 4. adminUser join (creates an authenticated admin session)
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. fetch a status history detail as admin
  const statusHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const history: ICommunityPlatformCommunityStatusHistory =
    await api.functional.communityPlatform.adminUser.communities.statusHistories.at(
      connection,
      {
        communitySlug,
        statusHistoryId,
      },
    );
  typia.assert(history);

  // 6. Light business invariants independent of fixture correlation
  TestValidator.predicate(
    "history.community.slug is non-empty",
    history.community.slug.length > 0,
  );
  TestValidator.predicate(
    "history.newVisibility is non-empty",
    history.newVisibility.length > 0,
  );
  TestValidator.predicate(
    "history.newStatus is non-empty",
    history.newStatus.length > 0,
  );
  TestValidator.predicate(
    "history.createdAt is non-empty",
    history.createdAt.length > 0,
  );
}
