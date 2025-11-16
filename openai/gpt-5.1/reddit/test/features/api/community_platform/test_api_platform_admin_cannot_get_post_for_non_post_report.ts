import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Ensure platform admin cannot fetch a post for a report that is not a post
 * report.
 *
 * Business goal
 *
 * - Validate that GET /communityPlatform/platformAdmin/reports/{reportId}/post
 *   only works for reports that are specifically bound to posts via the
 *   report-of-posts subtype table. For generic reports (no post binding), the
 *   endpoint must fail with a client error and must not return any
 *   ICommunityPlatformPost payload.
 *
 * High-level flow
 *
 * 1. Register and implicitly authenticate a platform admin.
 * 2. As the admin, create a community visibility level configuration that member
 *    users can reference when creating communities.
 * 3. As the admin, create a post type configuration for standard text posts that
 *    member users can reference when creating posts.
 * 4. Register and authenticate a member user.
 * 5. As the member, create a community using the visibility level created in step
 *    2.
 * 6. As the member, create a post in that community using the post type created in
 *    step 3 (this provides realistic content context but is not directly bound
 *    to the report we will use).
 * 7. As the member, create a generic report using
 *    /communityPlatform/memberUser/reports. This creates only the top-level
 *    report row; no post subtype binding is established, so this report is not
 *    a "post report".
 * 8. Switch back to platform-admin context via /auth/platformAdmin/login.
 * 9. Invoke GET /communityPlatform/platformAdmin/reports/{reportId}/post using the
 *    id of the generic report created in step 7.
 * 10. Assert that the call fails (throws) via TestValidator.error, proving that the
 *     backend rejects attempts to fetch a post for a non-post report.
 */
export async function test_api_platform_admin_cannot_get_post_for_non_post_report(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join also authenticates and sets Authorization header).
  const adminJoinInput = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin-console.example.com/register",
    referrer: "https://landing.example.com",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create a community visibility level as platform admin.
  const visibilityCreate = {
    code: `public_${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreate },
    );
  typia.assert(visibility);

  // 3. Create a post type as platform admin.
  const postTypeCreate = {
    code: `text_${RandomGenerator.alphabets(6)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreate },
    );
  typia.assert(postType);

  // 4. Register a member user (join gives us an authenticated member session).
  const memberJoinInput = {
    username: `member_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberPass123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://campaign.example.com",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as the member user.
  const communityCreate = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 6. Create a post in that community as the member user.
  const postCreate = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 7. Create a generic report as member user via /communityPlatform/memberUser/reports.
  //    We build a minimal but valid ICommunityPlatformReport.ICreate payload.
  const reportCreate = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreate },
    );
  typia.assert(report);

  // 8. Switch back to platform admin context using login.
  const adminLoginInput = {
    identifier: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: "127.0.0.1",
    href: "https://admin-console.example.com/login",
    referrer: "https://landing.example.com",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoggedIn);

  // 9. As platform admin, attempt to fetch the post for this non-post report.
  //    This must fail because the report is not linked to a post subtype.
  await TestValidator.error(
    "platform admin cannot get post for non-post report",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.post.at(
        connection,
        { reportId: report.id },
      );
    },
  );
}
