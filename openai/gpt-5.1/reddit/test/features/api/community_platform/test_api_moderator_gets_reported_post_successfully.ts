import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
 * Validate that a community moderator can retrieve the full post associated
 * with a report targeting a post.
 *
 * Business journey:
 *
 * 1. Register platform admin and implicitly authenticate.
 * 2. As platform admin, create a community visibility level.
 * 3. As platform admin, create a generic text post type.
 * 4. Register a member user and implicitly authenticate.
 * 5. As member user, create a community using the visibility level from step 2.
 * 6. As member user, create a post in that community using the post type from step
 *    3.
 * 7. As member user, create a report that (by domain logic) targets that post.
 * 8. Register a community moderator and implicitly authenticate as moderator.
 * 9. As moderator, call GET
 *    /communityPlatform/communityModerator/reports/{reportId}/post.
 * 10. Verify that the returned ICommunityPlatformPost matches the originally
 *     created post (id, community, author, postType, and content fields).
 */
export async function test_api_moderator_gets_reported_post_successfully(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (implicitly logged-in)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create visibility level as platform admin
  const visibilityLevelCode = `vl_${RandomGenerator.alphabets(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: "Public Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create post type as platform admin
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins (implicitly logged-in as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 5. Member creates a community
  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 6. Member creates a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBodyText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: postTitle,
    body: postBodyText,
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  // 7. Member creates a report targeting the above post (via generic report API)
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 8. Community moderator joins (implicitly authenticated as moderator)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 9. Moderator retrieves the reported post
  const resolvedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communityModerator.reports.post.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(resolvedPost);

  // 10. Validate that moderator sees exactly the original post
  TestValidator.equals(
    "resolved post id matches created post id",
    resolvedPost.id,
    createdPost.id,
  );

  TestValidator.equals(
    "resolved post community id matches created post community id",
    resolvedPost.community.id,
    createdPost.community.id,
  );

  TestValidator.equals(
    "resolved post author id matches created post author id",
    resolvedPost.author.id,
    createdPost.author.id,
  );

  TestValidator.equals(
    "resolved post postType id matches created post postType id",
    resolvedPost.postType.id,
    createdPost.postType.id,
  );

  TestValidator.equals(
    "resolved post title matches original title (moderator can see content)",
    resolvedPost.title,
    postTitle,
  );

  TestValidator.equals(
    "resolved post body matches original body (moderator can see full content)",
    resolvedPost.body,
    postBodyText,
  );
}
