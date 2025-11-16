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
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validate hard deletion of a post-level report after a full member reporting
 * flow.
 *
 * This test covers the following business workflow:
 *
 * 1. A memberUser joins the platform and logs in.
 * 2. The memberUser creates a new community.
 * 3. The memberUser joins that community via a membership record.
 * 4. The memberUser creates a post inside that community.
 * 5. The memberUser files a post-level report against that post.
 * 6. While still authenticated as memberUser, an attempt to call the admin-only
 *    hard-delete endpoint for the report must fail.
 * 7. An adminUser account is created and logged in.
 * 8. The adminUser successfully hard deletes the post report.
 * 9. A second delete attempt for the same report id must fail, behaving as if the
 *    report no longer exists.
 *
 * This validates:
 *
 * - Proper end-to-end creation of communities, memberships, posts, and reports by
 *   a memberUser.
 * - Authorization boundaries: only adminUser context can perform hard delete on
 *   post reports; memberUser cannot.
 * - Hard-delete semantics: once deleted, deleting the same report again results
 *   in an error instead of success.
 */
export async function test_api_post_report_hard_delete_after_member_report_flow(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 2. Explicit login as the same memberUser to exercise login flow
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 3. Member creates a community
  const communitySlug: string = RandomGenerator.alphaNumeric(16);
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Member joins the community (membership creation)
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
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );

  // 5. Member creates a post in that community
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
    "post community id matches created community",
    post.community_id,
    community.id,
  );

  // 6. Member files a post-level report for the created post
  const postReportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    severity: "low",
  } satisfies ICommunityPlatformPostReport.ICreate;

  const postReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: postReportCreateBody,
      },
    );
  typia.assert(postReport);

  TestValidator.equals(
    "postReport post id matches created post",
    postReport.post?.id ?? post.id,
    post.id,
  );

  // 7. While authenticated as memberUser, attempt to hard delete the report
  await TestValidator.error(
    "memberUser cannot hard delete post report via admin endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.erase(
        connection,
        {
          postReportId: postReport.id,
        },
      );
    },
  );

  // 8. Register a new adminUser (admin join)
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 9. Explicit admin login to ensure admin session is active
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 10. As adminUser, hard delete the post report
  await api.functional.communityPlatform.adminUser.postReports.erase(
    connection,
    {
      postReportId: postReport.id,
    },
  );

  // 11. Second delete attempt for the same report id must now fail
  await TestValidator.error(
    "hard deleted post report cannot be deleted again",
    async () => {
      await api.functional.communityPlatform.adminUser.postReports.erase(
        connection,
        {
          postReportId: postReport.id,
        },
      );
    },
  );
}
