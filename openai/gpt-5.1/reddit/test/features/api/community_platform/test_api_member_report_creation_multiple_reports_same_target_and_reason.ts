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
 * Validate duplicate memberUser report submissions for the same target context
 * and reason.
 *
 * Business flow:
 *
 * 1. Register a member user who will act as the reporter (join).
 * 2. Register a platform admin and create a reusable report reason category.
 * 3. Log back in as the member user, create a community and a post within it.
 * 4. As the member, submit a report against the community context with a specific
 *    reason category.
 * 5. Immediately submit an identical report again to exercise duplicate controls.
 * 6. Validate that the first report succeeds and that the second is rejected as a
 *    duplicate by asserting an error on the second creation attempt.
 */
export async function test_api_member_report_creation_multiple_reports_same_target_and_reason(
  connection: api.IConnection,
) {
  // 1. Register a member user (will be our reporter)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Register a platform admin and create a report reason category
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(14);

  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // Create a report reason category as platformAdmin
  const reasonCodeSlug: string = `spam_${RandomGenerator.alphabets(8)}`;
  const reasonCreateBody = {
    code: reasonCodeSlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(reasonCategory);

  // 3. Log back in as member user, create a community and a post
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoggedIn);

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
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
  typia.assert<ICommunityPlatformCommunity>(community);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 4. Prepare a single report create payload
  const reportDescription: string = RandomGenerator.paragraph({
    sentences: 6,
  });

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: community.id,
    severity: "medium",
    description: reportDescription,
  } satisfies ICommunityPlatformReport.ICreate;

  // First report creation should succeed
  const report1: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report1);

  // Basic sanity checks on the first report context
  TestValidator.equals(
    "first report should have reporter_type 'member'",
    report1.reporter_type,
    "member",
  );

  if (report1.reason_category) {
    TestValidator.equals(
      "first report reason_category.id should match created reason category",
      report1.reason_category.id,
      reasonCategory.id,
    );
  }

  if (report1.context_community) {
    TestValidator.equals(
      "first report context_community.id should match created community",
      report1.context_community.id,
      community.id,
    );
  }

  // 5. Second, identical report creation should be rejected as a duplicate
  await TestValidator.error(
    "duplicate report with same member, reason, and community should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body: reportCreateBody,
        },
      );
    },
  );
}
