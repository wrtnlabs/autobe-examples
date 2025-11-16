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
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Verify admin guest user detail retrieval stability after an
 * attachment-related report workflow.
 *
 * Business goal:
 *
 * - Exercise the typical moderation-related workflow up to the point of creating
 *   a report targeting an attachment.
 * - Then validate that the admin-only guest user detail API can be called and
 *   returns a stable, schema-conform guest placeholder for a given
 *   guestUserId.
 *
 * Scenario implemented (within available APIs):
 *
 * 1. Admin registers via /auth/adminUser/join and becomes authenticated as
 *    adminUser.
 * 2. Member registers via /auth/memberUser/join and becomes authenticated as
 *    memberUser.
 * 3. Switch back to admin and create an article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 4. Switch to member and create an article in that category via
 *    /discussionBoard/memberUser/articles.
 * 5. As the same member, attach a file to the article via
 *    /discussionBoard/memberUser/articles/{articleId}/attachments.
 * 6. As the same member, create a report whose target_attachment_id is the
 *    attachment id via /discussionBoard/memberUser/reports.
 * 7. Switch to admin again and call
 *    /discussionBoard/adminUser/guestUsers/{guestUserId} twice, using a
 *    deterministic UUID guestUserId for this test.
 * 8. Assert that both calls return structurally valid IDiscussionBoardGuestUser
 *    objects and that their id and anonymous_token fields remain stable across
 *    calls.
 */
export async function test_api_admin_guest_user_detail_after_attachment_report(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) and authentication
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member registration (join) and authentication
  const memberJoinBody = {
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: "MemberPassword!123",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://app.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to admin and create an article category
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 4. Switch to member and create an article in that category
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 5. Create an attachment under the article
  const attachmentBody = {
    file_uri: ("https://cdn.example.com/files/" +
      RandomGenerator.alphaNumeric(16)) as string & tags.Format<"uri">,
    file_name: `attachment-${RandomGenerator.alphaNumeric(8)}.png`,
    content_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: typia.random<number & tags.Type<"int32">>(),
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 6. Create a report targeting the attachment
  const reportBody = {
    category: "spam", // business-level reason code string
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    target_article_id: undefined,
    target_comment_id: undefined,
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 7. Switch to admin and retrieve guest user placeholder twice
  const adminReloginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login-again" as string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminReloginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminReloginAuthorized);

  // For this test, we use a deterministic guestUserId UUID for stability; in real flows it would come from report context.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const firstGuest: IDiscussionBoardGuestUser =
    await api.functional.discussionBoard.adminUser.guestUsers.at(connection, {
      guestUserId,
    });
  typia.assert(firstGuest);

  const secondGuest: IDiscussionBoardGuestUser =
    await api.functional.discussionBoard.adminUser.guestUsers.at(connection, {
      guestUserId,
    });
  typia.assert(secondGuest);

  // 8. Validate stability of guest user placeholder across multiple retrievals
  TestValidator.equals(
    "guest user ID should be stable across retrievals",
    firstGuest.id,
    secondGuest.id,
  );
  TestValidator.equals(
    "guest user anonymous_token should be stable across retrievals",
    firstGuest.anonymous_token,
    secondGuest.anonymous_token,
  );
}
