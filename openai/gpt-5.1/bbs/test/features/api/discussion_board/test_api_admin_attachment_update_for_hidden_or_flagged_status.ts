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
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that only an admin user can moderate an attachment status (e.g.,
 * hide a file) and that the update is correctly persisted.
 *
 * Business flow:
 *
 * 1. Register and implicitly authenticate an adminUser.
 * 2. Register and implicitly authenticate a memberUser.
 * 3. As adminUser, create a discussion board article category.
 * 4. As memberUser, create an article in that category.
 * 5. As memberUser, create an attachment for that article.
 * 6. As adminUser, update the attachment using the admin attachment update
 *    endpoint to change its status to a hidden/moderated state.
 * 7. Verify that the response reflects the new status and keeps the attachment
 *    linked properly to the article.
 * 8. Verify that a non-admin connection cannot call the admin update endpoint
 *    (authorization failure).
 */
export async function test_api_admin_attachment_update_for_hidden_or_flagged_status(
  connection: api.IConnection,
) {
  // 1. Register an adminUser; join also authenticates and sets token.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1n!" as string & tags.Format<"password">,
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

  // 2. Register a memberUser; join also authenticates and sets token.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://board.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;
  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // After member join, connection now holds memberUser token. Switch back to admin.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;
  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. As adminUser, create an article category.
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Switch to memberUser and create an article in that category.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://board.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/home" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;
  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 5. As memberUser, create an attachment for that article.
  const attachmentCreateBody = {
    file_uri: "https://cdn.example.com/files/".concat(
      RandomGenerator.alphaNumeric(16),
    ) as string & tags.Format<"uri">,
    file_name: `${RandomGenerator.alphabets(8)}.png`,
    content_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;
  const createdAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(createdAttachment);

  // 6. Switch back to adminUser and update the attachment to hidden.
  const adminLoginAgainBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;
  const adminLoggedInAgain: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert(adminLoggedInAgain);

  const updateBody = {
    status: "hidden",
  } satisfies IDiscussionBoardAttachment.IUpdate;
  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.adminUser.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: createdAttachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttachment);

  // 7. Validate that the attachment was updated correctly.
  TestValidator.equals(
    "attachment id remains the same after moderation update",
    updatedAttachment.id,
    createdAttachment.id,
  );
  TestValidator.equals(
    "attachment remains linked to the same article",
    updatedAttachment.discussion_board_article_id,
    createdAttachment.discussion_board_article_id,
  );
  TestValidator.equals(
    "attachment status is updated to hidden",
    updatedAttachment.status,
    "hidden",
  );

  // 8. Verify that memberUser cannot call the admin-only update endpoint.
  // Create a non-admin connection by dropping auth headers.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "memberUser (or unauthenticated) cannot invoke admin attachment update",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.update(
        unauthConnection,
        {
          articleId: article.id,
          attachmentId: createdAttachment.id,
          body: updateBody,
        },
      );
    },
  );
}
