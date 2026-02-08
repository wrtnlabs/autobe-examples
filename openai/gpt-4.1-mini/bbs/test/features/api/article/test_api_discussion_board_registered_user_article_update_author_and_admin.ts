import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_update_author_and_admin(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Article author updates their own article successfully.
  // 1. Authenticate as registered user (author).
  const authorJoinConnection: api.IConnection = { host: connection.host };
  const authorJoinResponse = await authorize_registered_user_join(
    authorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(authorJoinResponse);
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(authorConnection, {
    body: {},
  });
  // Use the token set in headers inside authorize_registered_user_login
  // 2. Create a new article as the author
  const createdArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      authorConnection,
      {
        body: {},
      },
    );
  typia.assert(createdArticle);
  // 3. Prepare update data: modify title, content, attachments, and tags
  const updatedTitle = `Updated Title ${RandomGenerator.alphabets(5)}`;
  const updatedContent = RandomGenerator.content({ paragraphs: 2 });
  // Create new attachments data arrays (files and images)
  // Assuming each attachment has at least name and URL fields, generate plausible new attachments
  const updatedFiles = [
    {
      fileName: `${RandomGenerator.alphabets(6)}.pdf`,
      fileType: "application/pdf",
      fileSize: 1024 * 50, // 50 KB
      downloadUrl: `https://files.example.com/${RandomGenerator.alphaNumeric(10)}`,
    },
  ];
  const updatedImages = [
    {
      imageName: `${RandomGenerator.alphabets(6)}.png`,
      imageUrl: `https://images.example.com/${RandomGenerator.alphaNumeric(10)}`,
      description: RandomGenerator.paragraph({ sentences: 1 }),
      order: 1,
    },
  ];
  // Add updated tags
  const updatedTags = [
    RandomGenerator.alphabets(5),
    RandomGenerator.alphabets(6),
  ];
  const updateBody: IDiscussionBoardArticle.IUpdate = {
    title: updatedTitle,
    content: updatedContent,
    files: updatedFiles,
    images: updatedImages,
    tags: updatedTags,
  };
  // 4. Update the article as the author
  const updatedArticle =
    await api.functional.discussionBoard.registeredUser.articles.update(
      authorConnection,
      {
        articleId: (createdArticle as any).id,
        body: updateBody,
      },
    );
  typia.assert(updatedArticle);
  // Validate that the updated article has updated values
  TestValidator.equals(
    "article title updated",
    (updatedArticle as any).title,
    updatedTitle,
  );
  TestValidator.equals(
    "article content updated",
    (updatedArticle as any).content,
    updatedContent,
  );
  TestValidator.equals(
    "article files updated",
    (updatedArticle as any).files,
    updatedFiles,
  );
  TestValidator.equals(
    "article images updated",
    (updatedArticle as any).images,
    updatedImages,
  );
  TestValidator.equals(
    "article tags updated",
    (updatedArticle as any).tags,
    updatedTags,
  );
  // Scenario 2: Administrator updates an article authored by another user
  // 1. Administrator authentication
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(adminJoinResponse);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {},
  });
  // 2. Another registered user joins and creates an article
  const otherUserJoinConnection: api.IConnection = { host: connection.host };
  const otherUserJoinResponse = await authorize_registered_user_join(
    otherUserJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(otherUserJoinResponse);
  const otherUserConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(otherUserConnection, {
    body: {},
  });
  const otherUserArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      otherUserConnection,
      {
        body: {},
      },
    );
  typia.assert(otherUserArticle);
  // 3. Admin updates the other user's article
  const adminUpdatedTitle = `Admin Updated Title ${RandomGenerator.alphabets(5)}`;
  const adminUpdatedContent = RandomGenerator.content({ paragraphs: 3 });
  const adminUpdatedFiles = [
    {
      fileName: `${RandomGenerator.alphabets(8)}.docx`,
      fileType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 1024 * 100,
      downloadUrl: `https://adminfiles.example.com/${RandomGenerator.alphaNumeric(15)}`,
    },
  ];
  const adminUpdatedImages = [
    {
      imageName: `${RandomGenerator.alphabets(8)}.jpg`,
      imageUrl: `https://adminimages.example.com/${RandomGenerator.alphaNumeric(12)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      order: 1,
    },
  ];
  const adminUpdatedTags = [
    RandomGenerator.alphabets(7),
    RandomGenerator.alphabets(8),
  ];
  const adminUpdateBody: IDiscussionBoardArticle.IUpdate = {
    title: adminUpdatedTitle,
    content: adminUpdatedContent,
    files: adminUpdatedFiles,
    images: adminUpdatedImages,
    tags: adminUpdatedTags,
  };
  const adminUpdatedArticle =
    await api.functional.discussionBoard.registeredUser.articles.update(
      adminConnection,
      {
        articleId: (otherUserArticle as any).id,
        body: adminUpdateBody,
      },
    );
  typia.assert(adminUpdatedArticle);
  // Validate updates by admin
  TestValidator.equals(
    "admin updated article title",
    (adminUpdatedArticle as any).title,
    adminUpdatedTitle,
  );
  TestValidator.equals(
    "admin updated article content",
    (adminUpdatedArticle as any).content,
    adminUpdatedContent,
  );
  TestValidator.equals(
    "admin updated article files",
    (adminUpdatedArticle as any).files,
    adminUpdatedFiles,
  );
  TestValidator.equals(
    "admin updated article images",
    (adminUpdatedArticle as any).images,
    adminUpdatedImages,
  );
  TestValidator.equals(
    "admin updated article tags",
    (adminUpdatedArticle as any).tags,
    adminUpdatedTags,
  );
}
