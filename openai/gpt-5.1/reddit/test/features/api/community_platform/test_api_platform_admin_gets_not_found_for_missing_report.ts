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
 * Ensure that a platform administrator receives an error when requesting the
 * associated post for a reportId that does not correspond to any existing
 * report.
 *
 * Business flow (within a single isolated test run):
 *
 * 1. Register a platformAdmin and obtain an authenticated admin session.
 * 2. As platformAdmin, create a community visibility level and a post type to
 *    support realistic community/post creation.
 * 3. Register and log in a memberUser actor.
 * 4. As memberUser, create a community that uses the created visibility level.
 * 5. As memberUser, create a post in that community using the created post type.
 * 6. As memberUser, create a background moderation report (for realism), but do
 *    not use its report.id for the negative test.
 * 7. Switch back to platformAdmin authentication.
 * 8. Generate a fresh UUID that is guaranteed not to equal the known report.id
 *    from step 6.
 * 9. Call GET /communityPlatform/platformAdmin/reports/{reportId}/post using the
 *    non-existent reportId and assert, via TestValidator.error, that the call
 *    fails rather than returning an ICommunityPlatformPost.
 *
 * In accordance with global E2E rules, this test only asserts that an error is
 * thrown (not inspecting HTTP status codes or error payload structure) and that
 * all successful operations before the error return correctly typed DTOs.
 */
export async function test_api_platform_admin_gets_not_found_for_missing_report(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (also authenticates and sets token)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a community visibility level
  const visibilityLevelCreateBody = {
    code: `public_${RandomGenerator.alphaNumeric(8)}`,
    name: "Public Visibility",
    description: "Publicly discoverable community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As platformAdmin, create a post type
  const postTypeCreateBody = {
    code: `text_${RandomGenerator.alphaNumeric(8)}`,
    name: "Text Post",
    description: "Standard text-based post type for discussions",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register a memberUser and authenticate as that member
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword!123",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedOnJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedOnLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedOnLogin);

  // 5. As memberUser, create a community using the visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Community for Missing Report",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. As memberUser, create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Background Post for Report Not-Found Test",
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. As memberUser, create a background report (not used for missing-id lookup)
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const backgroundReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(backgroundReport);

  // 8. Switch back to platformAdmin authentication
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedOnLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedOnLogin);

  // 9. Generate a non-existent reportId (valid UUID, distinct from known one)
  const nonExistingReportIdCandidate = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistingReportId =
    nonExistingReportIdCandidate === backgroundReport.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonExistingReportIdCandidate;

  // 10. Call reports.post.at with the non-existent reportId and assert error
  await TestValidator.error(
    "platformAdmin lookup of post for non-existent reportId should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.post.at(
        connection,
        {
          reportId: nonExistingReportId,
        },
      );
    },
  );
}
