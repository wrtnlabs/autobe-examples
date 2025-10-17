import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";

/**
 * Validate listing, filtering, and paginating moderator assignments as an
 * admin.
 *
 * 1. Register a platform admin (using unique email).
 * 2. Register a regular member (using unique email).
 * 3. As the member, create a new community (unique name and slug).
 * 4. As the member, create a post in the new community (to satisfy platform
 *    prerequisites for moderator existence).
 * 5. As admin, request the moderator assignments index endpoint with no filters
 *    (should succeed, return pagination, at least one record or empty if system
 *    doesn’t auto-assign moderator).
 * 6. Request with filter by member_id (should filter correctly).
 * 7. Request with filter by community_id (should filter correctly).
 * 8. Request with invalid page (e.g., much higher than available pages; expect
 *    empty data).
 * 9. Request with filter for impossible status/email (expect empty data).
 * 10. Switch to non-admin (member) context and attempt the same endpoint (should be
 *     denied—permission error expected).
 */
export async function test_api_moderator_admin_list_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpass123",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberpass456",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. As member, create a community
  const communityReq = {
    name: RandomGenerator.name().replace(/\s/g, "").substring(0, 20),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityReq,
      },
    );
  typia.assert(community);

  // 4. As member, create a post (for completeness)
  const postReq = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.paragraph({ sentences: 10 }),
    content_type: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postReq,
    },
  );
  typia.assert(post);

  // 5. As admin, list moderators (no filters)
  const pageAll = await api.functional.communityPlatform.admin.moderators.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(pageAll);
  TestValidator.predicate(
    "moderator pageAll has pagination",
    pageAll.pagination !== undefined,
  );

  // Edge: handle possible empty system (assert response shape at least)
  TestValidator.equals(
    "pageAll data array type",
    Array.isArray(pageAll.data),
    true,
  );

  // 6. Filter by member_id
  const pageByMember =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: { member_id: member.id },
    });
  typia.assert(pageByMember);
  TestValidator.predicate(
    "moderator pageByMember filtered correctly",
    pageByMember.data.every((m) => m.member_id === member.id),
  );

  // 7. Filter by community_id
  const pageByCommunity =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: { community_id: community.id },
    });
  typia.assert(pageByCommunity);
  TestValidator.predicate(
    "moderator pageByCommunity filtered correctly",
    pageByCommunity.data.every((m) => m.community_id === community.id),
  );

  // 8. Invalid page
  const invalidPage =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: { page: 9999, limit: 10 },
    });
  typia.assert(invalidPage);
  TestValidator.equals(
    "invalid page returns empty data",
    invalidPage.data.length,
    0,
  );

  // 9. Impossible filter (status)
  const pageImpossibleStatus =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: { status: "this-status-should-not-exist" },
    });
  typia.assert(pageImpossibleStatus);
  TestValidator.equals(
    "impossible status returns empty data",
    pageImpossibleStatus.data.length,
    0,
  );

  // 9. Impossible filter (email)
  const pageImpossibleEmail =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: { email: "idonotexist@emailprobably.invalid" },
    });
  typia.assert(pageImpossibleEmail);
  TestValidator.equals(
    "impossible email returns empty data",
    pageImpossibleEmail.data.length,
    0,
  );

  // 10. Switch to member context, attempt admin endpoint
  await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "attemptfail999",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "member cannot access admin moderator endpoint",
    async () => {
      await api.functional.communityPlatform.admin.moderators.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
}
