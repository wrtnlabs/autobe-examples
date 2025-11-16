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

export async function test_api_admin_community_status_history_detail_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Register a member user and keep its credentials for later re-login
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the member user
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community as the member user for realism
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // Prepare parameters for status history detail endpoint
  const communitySlug: string = community.slug;
  const statusHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Unauthenticated access should be blocked
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to admin status history must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.statusHistories.at(
        unauthConn,
        {
          communitySlug,
          statusHistoryId,
        },
      );
    },
  );

  // 5. Member-authenticated access should be blocked
  // Ensure we are logged in as the member explicitly using the login endpoint
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  await TestValidator.error(
    "member-authenticated access to admin status history must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.statusHistories.at(
        connection,
        {
          communitySlug,
          statusHistoryId,
        },
      );
    },
  );

  // 6. Register an admin user and authenticate
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Optional: perform an explicit admin login to simulate realistic token lifecycle
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAfterLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 7. Admin-authenticated access should succeed and return a typed history detail
  const history: ICommunityPlatformCommunityStatusHistory =
    await api.functional.communityPlatform.adminUser.communities.statusHistories.at(
      connection,
      {
        communitySlug,
        statusHistoryId,
      },
    );
  typia.assert(history);

  // Basic sanity checks on the returned history
  TestValidator.predicate("history has non-empty id", history.id.length > 0);
  TestValidator.equals(
    "history community slug is a string (no crash)",
    typeof history.community.slug,
    "string",
  );
}
