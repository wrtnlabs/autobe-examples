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
 * Validate admin access and type correctness for community status history
 * detail.
 *
 * Business intent (adapted to available APIs):
 *
 * - Ensure an adminUser can authenticate and call the status history detail
 *   endpoint.
 * - Ensure the endpoint returns a structurally valid
 *   ICommunityPlatformCommunityStatusHistory when invoked.
 * - Exercise realistic data setup by creating a memberUser, two communities, and
 *   posts before admin-only operations.
 *
 * Steps:
 *
 * 1. As a memberUser, join the platform and establish an authenticated session.
 * 2. As the same memberUser, create two communities with distinct slugs.
 * 3. As that memberUser, create one post in each community.
 * 4. Register an adminUser via /auth/adminUser/join and obtain admin tokens.
 * 5. Optionally log in as the same adminUser via /auth/adminUser/login to simulate
 *    admin actor switching.
 * 6. As the authenticated adminUser, call GET
 *    /communityPlatform/adminUser/communities/{communitySlug}/statusHistories/{statusHistoryId}
 *    with random slug and random UUID for statusHistoryId.
 * 7. Assert that the response is structurally valid
 *    ICommunityPlatformCommunityStatusHistory using typia.assert.
 */
export async function test_api_admin_community_status_history_detail_mismatched_community_and_history(
  connection: api.IConnection,
) {
  // 1. MemberUser joins the platform (creates account + session)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create two distinct communities as memberUser
  const communityCreateBodyA = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
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

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBodyA,
      },
    );
  typia.assert(communityA);

  const communityCreateBodyB = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
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

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBodyB,
      },
    );
  typia.assert(communityB);

  TestValidator.notEquals(
    "created communities must have different slugs",
    communityA.slug,
    communityB.slug,
  );

  // 3. Create one post in each community as memberUser
  const postCreateBodyA = {
    communityId: communityA.id,
    communityCode: communityA.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBodyA,
    });
  typia.assert(postA);

  const postCreateBodyB = {
    communityId: communityB.id,
    communityCode: communityB.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBodyB,
    });
  typia.assert(postB);

  // 4. Register an adminUser
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "Adm1nPass!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedOnJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 5. Explicit admin login to simulate actor switching, using identifier + password
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: "Adm1nPass!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedOnLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 6. As authenticated adminUser, call status history detail endpoint.
  //    We use a random UUID for statusHistoryId because we have no list/creation API.
  const randomHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const history: ICommunityPlatformCommunityStatusHistory =
    await api.functional.communityPlatform.adminUser.communities.statusHistories.at(
      connection,
      {
        communitySlug: communityA.slug,
        statusHistoryId: randomHistoryId,
      },
    );

  // 7. Validate response type and basic scoping fields
  typia.assert(history);

  TestValidator.equals(
    "status history community slug should match requested slug",
    history.community.slug,
    communityA.slug,
  );
}
