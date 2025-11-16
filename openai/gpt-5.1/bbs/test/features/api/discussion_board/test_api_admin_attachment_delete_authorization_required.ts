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

export async function test_api_admin_attachment_delete_authorization_required(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates account and authenticates)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Member joins (creates account and authenticates)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassword123!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article in the created category
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

  // 5. Member creates an attachment for that article
  const attachmentCreateBody = {
    file_uri: typia.random<string & tags.Format<"uri">>(),
    file_name: `file_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/plain",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: typia.random<number & tags.Type<"int32">>(),
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // Helper to list attachments and assert existence / non-existence
  const assertAttachmentPresence = async (
    titlePrefix: string,
    expectedPresent: boolean,
  ) => {
    const listBody = {
      page: 0 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      sortField: undefined,
      sortOrder: undefined,
      fileExtension: undefined,
      contentType: undefined,
    } satisfies IDiscussionBoardAttachment.IRequest;

    const page: IPageIDiscussionBoardAttachment.ISummary =
      await api.functional.discussionBoard.articles.attachments.index(
        connection,
        {
          articleId: article.id,
          body: listBody,
        },
      );
    typia.assert(page);

    const exists = page.data.some((att) => att.id === attachment.id);

    if (expectedPresent) {
      TestValidator.predicate(
        `${titlePrefix} - attachment should be present`,
        exists,
      );
    } else {
      TestValidator.predicate(
        `${titlePrefix} - attachment should be absent`,
        !exists,
      );
    }
  };

  // Sanity check: attachment appears before any delete attempts
  await assertAttachmentPresence("before delete attempts", true);

  // 6. Unauthenticated delete attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated admin attachment delete should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.erase(
        unauthenticatedConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // After unauthenticated failure, attachment must still exist
  await assertAttachmentPresence("after unauthenticated delete attempt", true);

  // 7. Member token delete attempt (connection currently authenticated as member)
  await TestValidator.error(
    "member token admin attachment delete should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // After member failure, attachment must still exist
  await assertAttachmentPresence("after member delete attempt", true);

  // 8. Admin login to switch connection back to admin actor
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 9. Admin performs successful delete
  await api.functional.discussionBoard.adminUser.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // 10. Verify attachment is no longer present
  await assertAttachmentPresence("after admin delete", false);
}
