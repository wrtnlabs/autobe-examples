import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that a restricted member user cannot create reports.
 *
 * This test covers the negative case where a member user has had a moderation
 * restriction applied by an admin, and we verify that the member cannot file
 * new discussion board reports while that restriction is in effect.
 *
 * Business context
 *
 * - Member users can normally create articles and then file reports about
 *   problematic content (articles, comments, attachments) via
 *   /discussionBoard/memberUser/reports.
 * - Administrative users can apply restriction records to member users using
 *   /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction that
 *   represent moderation actions such as temporary or permanent
 *   posting/reporting blocks.
 * - Once a restriction is active, the system should prevent the member from
 *   abusing the report mechanism.
 *
 * Scenario steps
 *
 * 1. Register a memberUser via /auth/memberUser/join and capture
 *    IDiscussionBoardMemberuser.IAuthorized (including member id).
 * 2. Register an adminUser via /auth/adminUser/join and capture
 *    IDiscussionBoardAdminuser.IAuthorized.
 * 3. As adminUser, create a restriction record for the memberUser via
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction with a
 *    restriction_level representing a full posting/reporting block.
 * 4. Switch authentication back to the memberUser via /auth/memberUser/login.
 * 5. As the restricted memberUser, create a valid article via
 *    /discussionBoard/memberUser/articles so there is a concrete article id to
 *    target in a report.
 * 6. Still as the restricted memberUser, attempt to create a report via
 *    /discussionBoard/memberUser/reports targeting the created article using a
 *    valid IDiscussionBoardReport.ICreate payload.
 * 7. Use TestValidator.error to assert that the report creation call fails
 *    (throws), indicating that restrictions are being enforced for report
 *    creation.
 *
 * The test does not assert specific HTTP status codes or error payloads; it
 * only validates that the report creation is not allowed for a restricted
 * user.
 */
export async function test_api_report_creation_by_restricted_member_user_blocked(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) and validate response
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Preserve member credentials for later login
  const memberEmail = memberJoinBody.email;
  const memberPassword = memberJoinBody.password;
  const memberUserId = memberAuthorized.id;

  // 2. Register an admin user (join) and validate response
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://example.com/admin/signup",
    referrer: "https://example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, apply a restriction to the member user
  const nowIso = new Date().toISOString();
  const restrictionBody = {
    restriction_level: "full_block",
    reason_category: "abuse_reports",
    started_at: nowIso,
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const restriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: restrictionBody,
      },
    );
  typia.assert(restriction);

  // 4. Switch authentication back to the member user via login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. As restricted member, create a valid article to target in report
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 6. Attempt to create a report as the restricted member, targeting the article
  const reportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
    target_comment_id: undefined,
    target_attachment_id: undefined,
  } satisfies IDiscussionBoardReport.ICreate;

  // 7. Assert that report creation fails due to restriction
  await TestValidator.error(
    "restricted member cannot create report",
    async () => {
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body: reportBody,
        },
      );
    },
  );
}
