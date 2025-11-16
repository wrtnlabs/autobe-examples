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
 * Validate that logically deleted attachments are not listed for an article.
 *
 * Business flow:
 *
 * 1. Admin joins and creates an article category.
 * 2. Member joins (and logs in once more) to establish a memberUser session.
 * 3. Member creates an article in that category.
 * 4. Member creates three attachments for the article.
 * 5. Member lists attachments via PATCH
 *    /discussionBoard/articles/{articleId}/attachments and verifies all created
 *    IDs appear.
 * 6. Member deletes one attachment via DELETE memberUser attachments endpoint.
 * 7. Member lists attachments again and verifies the deleted attachment ID is no
 *    longer present while others remain visible.
 *
 * The test focuses specifically on logical deletion visibility (deleted_at
 * semantics) rather than status-specific visibility, because only the delete
 * endpoint is guaranteed to affect listing visibility according to the provided
 * schema descriptions.
 */
export async function test_api_article_attachments_listing_visibility_for_deleted_or_hidden_attachments(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1n!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member joins
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "member-password",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Optional member login to exercise login path as well
  const memberLoginBody = {
    email: memberEmail,
    password: "member-password",
    ip: "127.0.0.1",
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAfterLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 4. Member creates an article in the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. Member creates multiple attachments for the article
  const createAttachment = async (
    orderInArticle: number & tags.Type<"int32">,
    status: string,
  ): Promise<IDiscussionBoardAttachment> => {
    const attachmentBody = {
      file_uri: typia.random<string & tags.Format<"uri">>(),
      file_name: RandomGenerator.paragraph({ sentences: 2 }),
      content_type: RandomGenerator.pick([
        "image/png",
        "image/jpeg",
        "application/pdf",
      ] as const),
      file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      order_in_article: orderInArticle,
      status,
    } satisfies IDiscussionBoardAttachment.ICreate;

    const created: IDiscussionBoardAttachment =
      await api.functional.discussionBoard.memberUser.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: attachmentBody,
        },
      );
    typia.assert(created);
    return created;
  };

  const attachment1 = await createAttachment(
    1 as number & tags.Type<"int32">,
    "active",
  );
  const attachment2 = await createAttachment(
    2 as number & tags.Type<"int32">,
    "active",
  );
  const attachment3 = await createAttachment(
    3 as number & tags.Type<"int32">,
    "hidden",
  );

  const createdIds: string[] = [attachment1.id, attachment2.id, attachment3.id];

  // 6. Baseline listing before deletion
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardAttachment.IRequest;

  const baselinePage: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: listRequestBody,
      },
    );
  typia.assert(baselinePage);

  const baselineIds: string[] = baselinePage.data.map((a) => a.id);

  // Ensure all created IDs are present in the baseline list
  for (const id of createdIds) {
    TestValidator.predicate(
      `baseline listing contains attachment ${id}`,
      baselineIds.includes(id),
    );
  }

  // Sanity check on pagination metadata
  const p1 = baselinePage.pagination;
  TestValidator.predicate(
    "baseline pagination records non-negative",
    p1.records >= 0,
  );
  TestValidator.predicate(
    "baseline pagination limit non-negative",
    p1.limit >= 0,
  );
  TestValidator.predicate(
    "baseline pagination pages non-negative",
    p1.pages >= 0,
  );

  const baselineVisibleCreatedCount = baselineIds.filter((id) =>
    createdIds.includes(id),
  ).length;

  TestValidator.predicate(
    "baseline listing includes all created attachments",
    baselineVisibleCreatedCount === createdIds.length,
  );

  // 7. Logically delete one attachment (attachment2)
  await api.functional.discussionBoard.memberUser.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment2.id,
    },
  );

  // 8. Listing after deletion
  const afterDeletePage: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: listRequestBody,
      },
    );
  typia.assert(afterDeletePage);

  const afterDeleteIds: string[] = afterDeletePage.data.map((a) => a.id);

  // Deleted attachment must not appear
  TestValidator.predicate(
    "deleted attachment is not listed",
    !afterDeleteIds.includes(attachment2.id),
  );

  // Other attachments must still appear
  TestValidator.predicate(
    "attachment1 remains listed after deletion of attachment2",
    afterDeleteIds.includes(attachment1.id),
  );
  TestValidator.predicate(
    "attachment3 remains listed after deletion of attachment2",
    afterDeleteIds.includes(attachment3.id),
  );

  const afterPagination = afterDeletePage.pagination;
  TestValidator.predicate(
    "after-delete pagination records non-negative",
    afterPagination.records >= 0,
  );
  TestValidator.predicate(
    "after-delete pagination pages non-negative",
    afterPagination.pages >= 0,
  );

  const afterVisibleCreatedCount = afterDeleteIds.filter((id) =>
    createdIds.includes(id),
  ).length;

  TestValidator.predicate(
    "after-delete listing has one fewer visible created attachment",
    afterVisibleCreatedCount === createdIds.length - 1,
  );
}
