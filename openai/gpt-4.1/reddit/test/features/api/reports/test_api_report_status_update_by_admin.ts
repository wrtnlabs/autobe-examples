import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import type { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Verifies end-to-end that an admin can update report status on reported
 * content.
 *
 * Steps:
 *
 * 1. Register admin and user on the platform.
 * 2. User creates a community.
 * 3. User creates a post in their community.
 * 4. User reports the created post as inappropriate (e.g., 'abuse').
 * 5. Admin logs in.
 * 6. Admin updates report status (to 'under_review' then 'resolved') and adds
 *    moderation note.
 * 7. Assert only admins can update the report; unauthorized attempts are rejected.
 * 8. Validate all permitted status transitions are applied and actions are
 *    audit-logged.
 */
export async function test_api_report_status_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register admin and user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: "https://admin-registration.example.com",
      referrer: "https://referrer.example.com",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: RandomGenerator.name(),
      href: "https://user-registration.example.com",
      referrer: "https://referrer.example.com",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 2: User creates a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: User creates a post in the community
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: User reports the post as inappropriate
  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    {
      body: {
        report_type: RandomGenerator.pick([
          "abuse",
          "spam",
          "off_topic",
          "harassment",
          "explicit_content",
          "other",
        ] as const),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        target_post_id: post.id,
      } satisfies ICommunityPlatformReports.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report post id matches reported post",
    report.post_report?.target_post_id,
    post.id,
  );

  // Step 5: Admin logs in
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-login.example.com",
      referrer: "https://admin-login-referrer.example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // Step 6: Admin updates report status to 'under_review' and adds moderation notes
  const updated1 = await api.functional.communityPlatform.admin.reports.update(
    connection,
    {
      reportId: report.id,
      body: {
        status: "under_review",
        description: "Review started by moderation team.",
      } satisfies ICommunityPlatformReports.IUpdate,
    },
  );
  typia.assert(updated1);
  TestValidator.equals(
    "report updated to under_review",
    updated1.status,
    "under_review",
  );
  TestValidator.equals(
    "moderation note reflected",
    updated1.description,
    "Review started by moderation team.",
  );

  // Admin updates report status to 'resolved' and removes auto-hidden if present
  const updated2 = await api.functional.communityPlatform.admin.reports.update(
    connection,
    {
      reportId: report.id,
      body: {
        status: "resolved",
        auto_hidden: false,
        description:
          "Content reviewed and unhidden; no further action required.",
      } satisfies ICommunityPlatformReports.IUpdate,
    },
  );
  typia.assert(updated2);
  TestValidator.equals(
    "report updated to resolved",
    updated2.status,
    "resolved",
  );
  TestValidator.equals(
    "resolved moderation note",
    updated2.description,
    "Content reviewed and unhidden; no further action required.",
  );
  if (updated2.actions && updated2.actions.length > 0) {
    TestValidator.predicate(
      "audit actions include the status update to resolved",
      updated2.actions.some(
        (action) =>
          action.action_type === "status_update" &&
          action.new_status === "resolved",
      ),
    );
  }

  // Step 7: Unauthorized update attempt by user (should fail)
  // Switch back to user by logging in as user
  await api.functional.auth.user.join(connection, {
    // create new user for illustration
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://unauth-user.example.com",
      referrer: "https://unauth-user-ref.example.com",
    } satisfies ICommunityPlatformUser.IJoin,
  });

  await TestValidator.error(
    "non-admin cannot update report status",
    async () => {
      await api.functional.communityPlatform.admin.reports.update(connection, {
        reportId: report.id,
        body: {
          status: "under_review",
        } satisfies ICommunityPlatformReports.IUpdate,
      });
    },
  );
}
