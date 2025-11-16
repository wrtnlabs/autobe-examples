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
 * Platform admin retrieves the post associated with a member user's report.
 *
 * Business flow covered:
 *
 * 1. A platform admin registers (and is auto-authenticated).
 * 2. The platform admin configures a community visibility level and a post type.
 * 3. A member user registers and becomes the acting user.
 * 4. The member user creates a community using the configured visibility level.
 * 5. The member user creates a post in that community using the configured post
 *    type.
 * 6. The member user creates a report that (in the real system) is associated with
 *    the post.
 * 7. The admin logs back in and calls the report-post inspection endpoint.
 * 8. The test verifies that the retrieved post matches the one originally created
 *    (id, title, community, author, and postType associations).
 */
export async function test_api_platform_admin_gets_reported_post_successfully(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auto-authenticated, Authorization set)
  const platformAdminUsername = RandomGenerator.alphabets(12);
  const platformAdminEmail =
    `admin_${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const platformAdminPassword = "AdminPass123!";

  const platformAdminJoinBody = {
    username: platformAdminUsername,
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);

  // 3. As platform admin, create a post type
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: `Text ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Register a member user (auto-authenticated, Authorization becomes memberUser)
  const memberUsername = RandomGenerator.alphabets(12);
  const memberEmail =
    `member_${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const memberPassword = "MemberPass123!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As member user, create a community using the visibility level created above
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. As member user, create a text post in that community using the configured post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: `Post ${RandomGenerator.name(3)}`,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  // 7. As member user, create a report that targets this post (binding is handled by backend)
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 8. Switch back to platform admin via login (Authorization header updated by SDK)
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 9. Call the admin endpoint to fetch the post associated with this report
  const inspectedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.platformAdmin.reports.post.at(
      connection,
      { reportId: report.id },
    );
  typia.assert(inspectedPost);

  // 10. Validate that the inspected post matches the original one on key fields
  TestValidator.equals(
    "reported post id should match created post id",
    inspectedPost.id,
    createdPost.id,
  );

  TestValidator.equals(
    "reported post title should match created post title",
    inspectedPost.title,
    createdPost.title,
  );

  // 11. Validate associations: community, author, and postType
  TestValidator.equals(
    "reported post community id should match created community id",
    inspectedPost.community.id,
    community.id,
  );

  TestValidator.equals(
    "reported post author id should match member user id",
    inspectedPost.author.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "reported post type id should match created post type id",
    inspectedPost.postType.id,
    postType.id,
  );
}
