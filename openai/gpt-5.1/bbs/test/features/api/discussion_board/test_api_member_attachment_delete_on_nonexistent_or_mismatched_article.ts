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

export async function test_api_member_attachment_delete_on_nonexistent_or_mismatched_article(
  connection: api.IConnection,
) {
  // 1. Admin joins to create a category for articles
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // any string is allowed; Format<"password"> is type-level only
    display_name: RandomGenerator.name(),
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
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates Article A
  const articleABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleA: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleABody },
    );
  typia.assert(articleA);

  // 5. Member creates Article B
  const articleBBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleB: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBBody },
    );
  typia.assert(articleB);

  // 6. Member creates an attachment under Article A
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: RandomGenerator.paragraph({ sentences: 1 }),
    content_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "application/pdf",
    ] as const),
    file_size: 1024,
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: articleA.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 7. Attempt to delete the attachment using mismatched article (Article B)
  await TestValidator.error(
    "delete with mismatched articleId should fail",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.attachments.erase(
        connection,
        {
          articleId: articleB.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 8. Delete with the correct article (Article A) should succeed
  await api.functional.discussionBoard.memberUser.articles.attachments.erase(
    connection,
    {
      articleId: articleA.id,
      attachmentId: attachment.id,
    },
  );

  // 9. Optional: second delete should fail as not found (idempotent not-found semantics)
  await TestValidator.error(
    "second delete on same attachment under correct article should fail",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.attachments.erase(
        connection,
        {
          articleId: articleA.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
