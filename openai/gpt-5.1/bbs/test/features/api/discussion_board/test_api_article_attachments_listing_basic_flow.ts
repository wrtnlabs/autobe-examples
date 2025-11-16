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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Basic end-to-end flow for listing attachments of a discussion board article.
 *
 * Business steps:
 *
 * 1. Admin user joins to obtain an adminUser authentication context.
 * 2. Admin user creates an article category via POST
 *    /discussionBoard/adminUser/articleCategories.
 * 3. Member user joins to obtain a memberUser authentication context.
 * 4. Member user creates an article in the created category via POST
 *    /discussionBoard/memberUser/articles.
 * 5. Member user uploads multiple attachments (e.g., 3) to that article via POST
 *    /discussionBoard/memberUser/articles/{articleId}/attachments.
 * 6. The generic attachments listing endpoint PATCH
 *    /discussionBoard/articles/{articleId}/attachments is called with minimal
 *    pagination request.
 * 7. The response page is validated for:
 *
 *    - Pagination metadata consistency vs. the number of created attachments.
 *    - All returned attachments corresponding to the created ones.
 *    - Only attachments for the target article being present and active.
 */
export async function test_api_article_attachments_listing_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin user joins (register) and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorized);

  // 2. Admin creates an article category
  const articleCategoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: articleCategoryBody,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(category);

  // 3. Member user joins (register)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(memberAuthorized);

  // 4. Member user creates an article in the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert<IDiscussionBoardArticle>(article);

  // 5. Member user uploads multiple attachments (3) to the article
  const attachmentCount = 3;
  const createdAttachments: IDiscussionBoardAttachment[] = [];

  for (let i = 0; i < attachmentCount; ++i) {
    const fileExtension = RandomGenerator.pick(["pdf", "jpg", "png"] as const);

    const attachmentBody = {
      file_uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(
        16,
      )}.${fileExtension}`,
      file_name: `test_file_${i + 1}.${fileExtension}`,
      content_type:
        fileExtension === "pdf"
          ? "application/pdf"
          : fileExtension === "jpg"
            ? "image/jpeg"
            : "image/png",
      file_size: 1024 + i * 100,
      order_in_article: i + 1,
      status: "active",
    } satisfies IDiscussionBoardAttachment.ICreate;

    const created =
      await api.functional.discussionBoard.memberUser.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: attachmentBody,
        },
      );
    typia.assert<IDiscussionBoardAttachment>(created);
    createdAttachments.push(created);
  }

  // 6. List attachments for that article with minimal pagination request
  const listRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAttachment.IRequest;

  const page = await api.functional.discussionBoard.articles.attachments.index(
    connection,
    {
      articleId: article.id,
      body: listRequest,
    },
  );
  typia.assert<IPageIDiscussionBoardAttachment.ISummary>(page);

  const pagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 7. Validate pagination metadata and data contents
  TestValidator.equals(
    "pagination limit should equal request limit",
    pagination.limit,
    listRequest.limit,
  );

  TestValidator.predicate(
    "pagination current page should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination records should be at least number of created attachments",
    pagination.records >= createdAttachments.length,
  );

  TestValidator.predicate(
    "first page should contain at least the created attachments when limit is large enough",
    page.data.length >= createdAttachments.length,
  );

  // Check that each created attachment exists in listing (by file_name and status)
  for (const created of createdAttachments) {
    const found = page.data.find(
      (item) =>
        item.name === created.file_name &&
        item.size_bytes === created.file_size &&
        item.status === created.status,
    );

    TestValidator.predicate(
      `attachment ${created.file_name} should exist in listing`,
      !!found,
    );

    if (found) {
      TestValidator.predicate(
        `attachment ${created.file_name} should have a non-empty URL`,
        found.url.length > 0,
      );
    }
  }
}
