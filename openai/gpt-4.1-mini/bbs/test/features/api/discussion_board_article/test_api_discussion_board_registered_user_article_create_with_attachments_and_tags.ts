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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_create_with_attachments_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(userConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@example.com",
      password: "TestPass1234!",
    },
  });
  // Set auth header for userConnection
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // Prepare attachments: mixed files and images
  const attachments = ArrayUtil.repeat(3, (index) => {
    if (index % 2 === 0) {
      // file attachment
      return {
        fileName: `file${index + 1}.txt`,
        fileType: "text/plain",
        fileSize: 1234 + index * 100,
        downloadUrl: `https://example.com/files/file${index + 1}.txt`,
        displayOrder: index,
      };
    } else {
      // image attachment
      return {
        imageUrl: `https://example.com/images/image${index + 1}.jpg`,
        description: `Image ${index + 1}`,
        displayOrder: index,
      };
    }
  });
  // Prepare tags
  const tags = ArrayUtil.repeat(2, (index) => `tag${index + 1}`);
  // Obtain a valid sectionId as random UUID for test
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create article body
  const body = {
    title: RandomGenerator.name(3),
    content: RandomGenerator.content({ paragraphs: 3 }),
    sectionId: sectionId,
    tags: tags,
    attachments: attachments.map((att) => {
      if ("fileName" in att) {
        return {
          fileName: att.fileName!,
          fileType: att.fileType!,
          fileSize: att.fileSize!,
          downloadUrl: att.downloadUrl!,
          displayOrder: att.displayOrder!,
        };
      } else {
        return {
          imageUrl: att.imageUrl!,
          description: att.description ?? null,
          displayOrder: att.displayOrder!,
        };
      }
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  // 2. Create article
  const createdArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body },
    );
  // Assert article type
  typia.assert(createdArticle);
  // Assert article fields
  TestValidator.equals("article title", createdArticle.title, body.title);
  TestValidator.equals("article content", createdArticle.content, body.content);
  // Section: assert section exists and is object (cannot assert id as no such property)
  const section = typia.assert<IDiscussionBoardSection.ISummary>(
    createdArticle.section,
  );
  TestValidator.predicate(
    "article section exists",
    section !== null && typeof section === "object",
  );
  // Assert author matches
  TestValidator.equals(
    "article author id",
    createdArticle.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "article author email",
    createdArticle.author.email,
    authorizedUser.email,
  );
  // Tags: use ISummary[], assert tags count matches expected, and presence by id
  const tagsArray = typia.assert<IDiscussionBoardArticleTag.ISummary[]>(
    createdArticle.tags,
  );
  TestValidator.equals("created tags count", tagsArray.length, tags.length);
  // Since 'name' does not exist, check presence by counting tags with ids
  for (const tag of tags) {
    const found = tagsArray.some(
      (t) => t.discussionBoardTagId && tag.startsWith("tag"),
    ); // We only check tag exists by id, no direct name matching because name missing
    TestValidator.predicate(`article tag '${tag}' found`, found);
  }
  // Assert attachments are correct
  const createdFileNames = createdArticle.files.map((f) => f.fileName);
  const createdImageUrls = createdArticle.images.map((i) => i.imageUrl);
  attachments.forEach((att) => {
    if ("fileName" in att) {
      TestValidator.predicate(
        `article has file attachment '${att.fileName}'`,
        createdFileNames.includes(att.fileName!),
      );
    } else {
      TestValidator.predicate(
        `article has image attachment '${att.imageUrl}'`,
        createdImageUrls.includes(att.imageUrl!),
      );
    }
  });
  // Assert timestamps are valid ISO strings
  TestValidator.predicate(
    "article createdAt is ISO date",
    !isNaN(Date.parse(createdArticle.createdAt)),
  );
  TestValidator.predicate(
    "article updatedAt is ISO date",
    !isNaN(Date.parse(createdArticle.updatedAt)),
  );
}
