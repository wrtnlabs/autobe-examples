import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_super_administrator_article_retrieve_detail_completeness(
  connection: api.IConnection,
): Promise<void> {
  // Actor connections setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const registeredUserConnection: api.IConnection = { host: connection.host };
  // 1. Register super administrator with known password
  const superAdminPassword = "password1234";
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        password: superAdminPassword,
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminJoin);
  // 2. Login as super administrator using the known password
  const superAdminLogin = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: {
        email: superAdminJoin.email,
        password: superAdminPassword,
      },
    },
  );
  typia.assert(superAdminLogin);
  // 3. Register registered user with known password
  const registeredUserPassword = "password1234";
  const registeredUserJoin = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        password: registeredUserPassword,
        email: typia.random<string & tags.Format<"email">>(),
      },
    },
  );
  typia.assert(registeredUserJoin);
  // 4. Login as registered user using the known password
  const registeredUserLogin = await authorize_registered_user_login(
    registeredUserConnection,
    {
      body: {
        email: registeredUserJoin.email,
        password: registeredUserPassword,
      },
    },
  );
  typia.assert(registeredUserLogin);
  // 5. Registered user creates an article with attachments and tags
  const articleCreateBody: IDiscussionBoardArticle.ICreate = {
    title: "Test Article for completeness",
    content:
      "This article contains attachments and tags for completeness test.",
    sectionId: typia.random<string & tags.Format<"uuid">>(),
    tags: ["test-tag1", "test-tag2"],
    attachments: [
      {
        fileName: "file1.pdf",
        fileType: "application/pdf",
        fileSize: 12345,
        downloadUrl: "https://example.com/file1.pdf",
        displayOrder: 1,
      },
      {
        fileName: "file2.docx",
        fileType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 23456,
        downloadUrl: "https://example.com/file2.docx",
        displayOrder: 2,
      },
      {
        imageUrl: "https://example.com/image1.jpg",
        description: "Description 1",
        displayOrder: 1,
      },
      {
        imageUrl: "https://example.com/image2.png",
        description: "Description 2",
        displayOrder: 2,
      },
    ],
  };
  const createdArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: articleCreateBody },
    );
  typia.assert(createdArticle);
  // 6. Retrieve the article details as super administrator
  const responseArticle =
    await api.functional.discussionBoard.superAdministrator.articles.at(
      superAdminConnection,
      {
        articleId: createdArticle.id,
      },
    );
  typia.assert(responseArticle);
  // 7. Validate article attachments arrays order and metadata
  const expectedFiles = createdArticle.files
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const expectedImages = createdArticle.images
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
  TestValidator.equals(
    "files count",
    responseArticle.files.length,
    expectedFiles.length,
  );
  for (let i = 0; i < expectedFiles.length; i++) {
    const expectedFile = expectedFiles[i];
    const actualFile = responseArticle.files[i];
    TestValidator.equals("file id", actualFile.id, expectedFile.id);
    TestValidator.equals(
      "file articleId",
      actualFile.articleId,
      expectedFile.articleId,
    );
    TestValidator.equals(
      "file name",
      actualFile.fileName,
      expectedFile.fileName,
    );
    TestValidator.equals(
      "file type",
      actualFile.fileType,
      expectedFile.fileType,
    );
    TestValidator.equals(
      "file size",
      actualFile.fileSize,
      expectedFile.fileSize,
    );
    TestValidator.equals(
      "file downloadUrl",
      actualFile.downloadUrl,
      expectedFile.downloadUrl,
    );
    TestValidator.equals(
      "file displayOrder",
      actualFile.displayOrder,
      expectedFile.displayOrder,
    );
    TestValidator.predicate(
      "file createdAt is ISO string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        actualFile.createdAt,
      ),
    );
    TestValidator.predicate(
      "file updatedAt is ISO string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        actualFile.updatedAt,
      ),
    );
  }
  TestValidator.equals(
    "images count",
    responseArticle.images.length,
    expectedImages.length,
  );
  for (let i = 0; i < expectedImages.length; i++) {
    const expectedImage = expectedImages[i];
    const actualImage = responseArticle.images[i];
    TestValidator.equals("image id", actualImage.id, expectedImage.id);
    TestValidator.equals(
      "image articleId",
      actualImage.discussionBoardArticleId,
      expectedImage.discussionBoardArticleId,
    );
    TestValidator.equals(
      "image url",
      actualImage.imageUrl,
      expectedImage.imageUrl,
    );
    TestValidator.equals(
      "image description",
      actualImage.description,
      expectedImage.description,
    );
    TestValidator.equals(
      "image displayOrder",
      actualImage.displayOrder,
      expectedImage.displayOrder,
    );
    TestValidator.predicate(
      "image createdAt is ISO string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        actualImage.createdAt,
      ),
    );
    TestValidator.predicate(
      "image updatedAt is ISO string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        actualImage.updatedAt,
      ),
    );
  }
  // 8. Validate tags count
  TestValidator.equals(
    "tags count",
    responseArticle.tags.length,
    createdArticle.tags.length,
  );
  // Convert tags arrays to array of ids (string) and sort for comparison
  const sortedExpectedTags = createdArticle.tags.map((tag) => tag.id).sort();
  const sortedActualTags = responseArticle.tags.map((tag) => tag.id).sort();
  TestValidator.equals(
    "tags ids",
    sortedActualTags.join(","),
    sortedExpectedTags.join(","),
  );
  // 9. Validate article author info
  TestValidator.equals(
    "author id",
    responseArticle.author.id,
    registeredUserLogin.id,
  );
  TestValidator.equals(
    "author email",
    responseArticle.author.email,
    registeredUserLogin.email,
  );
  TestValidator.equals(
    "author displayName",
    responseArticle.author.displayName,
    registeredUserLogin.displayName,
  );
  TestValidator.equals(
    "author bio",
    responseArticle.author.bio ?? null,
    registeredUserLogin.bio ?? null,
  );
  TestValidator.equals(
    "author isBanned",
    responseArticle.author.isBanned,
    registeredUserLogin.isBanned,
  );
  TestValidator.predicate(
    "author createdAt is ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      responseArticle.author.createdAt,
    ),
  );
  TestValidator.predicate(
    "author updatedAt is ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      responseArticle.author.updatedAt,
    ),
  );
  // 10. Validate creation and update timestamps of article
  TestValidator.predicate(
    "article createdAt is ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      responseArticle.createdAt,
    ),
  );
  TestValidator.predicate(
    "article updatedAt is ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      responseArticle.updatedAt,
    ),
  );
  // 11. Validate that deletedAt is null or undefined (active article)
  TestValidator.predicate(
    "article deletedAt is null or undefined",
    responseArticle.deletedAt === null ||
      responseArticle.deletedAt === undefined,
  );
}
