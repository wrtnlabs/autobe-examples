import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_article_attachment_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = `moderator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Step 2: Create a category using moderator account
  const categoryAuth: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderatorAuth.token.access}`,
    },
  };

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      categoryAuth,
      {
        body: {
          name: `Category-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberAuth);

  // Step 4: Create an article using member account
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: `Article-${RandomGenerator.alphaNumeric(8)}`,
          body: RandomGenerator.content({ paragraphs: 3 }),
          category_id: category.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status", article.status, "pending_approval");

  // Step 5: Create an attachment for the article
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          parent_type: "comment",
          parent_id: article.id,
          original_filename: `test-${RandomGenerator.alphaNumeric(6)}.txt`,
          mime_type: "text/plain",
          file_size: 1024,
          storage_path: `/attachments/article/${article.id}/test-${RandomGenerator.alphaNumeric(8)}.txt`,
          file_hash: RandomGenerator.alphaNumeric(64),
          is_image: false,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment parent type",
    attachment.parent_type,
    "comment",
  );
  TestValidator.equals(
    "attachment parent id",
    attachment.parent_id,
    article.id,
  );
  TestValidator.equals("attachment is not image", attachment.is_image, false);

  // Step 6: Retrieve the attachment using the GET endpoint
  const retrievedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(retrievedAttachment);

  // Step 7: Validate attachment metadata
  TestValidator.equals(
    "attachment id matches",
    retrievedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment filename matches",
    retrievedAttachment.original_filename,
    attachment.original_filename,
  );
  TestValidator.equals(
    "attachment mime type matches",
    retrievedAttachment.mime_type,
    attachment.mime_type,
  );
  TestValidator.equals(
    "attachment file size matches",
    retrievedAttachment.file_size,
    attachment.file_size,
  );
  TestValidator.equals(
    "attachment storage path matches",
    retrievedAttachment.storage_path,
    attachment.storage_path,
  );
  TestValidator.equals(
    "attachment file hash matches",
    retrievedAttachment.file_hash,
    attachment.file_hash,
  );
}
