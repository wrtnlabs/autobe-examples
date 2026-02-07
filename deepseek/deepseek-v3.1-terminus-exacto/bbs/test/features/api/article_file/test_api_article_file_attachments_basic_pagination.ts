import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_attachments_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create multiple file attachments
  const fileCount = 5;
  const files = await ArrayUtil.asyncRepeat(fileCount, async (index) => {
    const fileTypes = [
      "application/pdf",
      "image/jpeg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ] as const;
    const fileType = RandomGenerator.pick(fileTypes);
    const file =
      await generate_random_discussion_board_user_articles_files_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            file_name: `test_file_${index + 1}.${getFileExtension(fileType)}`,
            file_type: fileType,
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            storage_path: `/uploads/article_${article.id}/file_${index + 1}`,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    return file;
  });
  // Test pagination with different page sizes
  const pageSizes = [2, 5, 10] as const;
  for (const pageSize of pageSizes) {
    const pageResponse =
      await api.functional.discussionBoard.articles.files.index(
        userConnection,
        {
          articleId: article.id,
          body: {
            page: 1,
            limit: pageSize satisfies number as number,
          } satisfies IDiscussionBoardArticleFile.IRequest,
        },
      );
    typia.assert(pageResponse);
    // Validate pagination metadata
    TestValidator.equals("current page", pageResponse.pagination.current, 1);
    TestValidator.equals("limit", pageResponse.pagination.limit, pageSize);
    TestValidator.equals(
      "total records",
      pageResponse.pagination.records,
      fileCount,
    );
    TestValidator.equals(
      "total pages",
      pageResponse.pagination.pages,
      Math.ceil(fileCount / pageSize),
    );
    // Validate data count matches page size or total files
    const expectedDataCount = Math.min(pageSize, fileCount);
    TestValidator.equals(
      "data count",
      pageResponse.data.length,
      expectedDataCount,
    );
    // Validate file metadata
    pageResponse.data.forEach((fileSummary, index) => {
      TestValidator.predicate(
        `file ${index} has id`,
        () => fileSummary.id.length > 0,
      );
      TestValidator.predicate(
        `file ${index} has file_name`,
        () => fileSummary.file_name.length > 0,
      );
      TestValidator.predicate(
        `file ${index} has file_type`,
        () => fileSummary.file_type.length > 0,
      );
      TestValidator.predicate(
        `file ${index} has valid file_size`,
        () => fileSummary.file_size >= 0,
      );
      TestValidator.predicate(
        `file ${index} has download_count`,
        () => fileSummary.download_count >= 0,
      );
      TestValidator.predicate(
        `file ${index} has created_at`,
        () => fileSummary.created_at.length > 0,
      );
    });
  }
  // Test second page with smaller page size
  const smallPageSize = 2;
  const page2Response =
    await api.functional.discussionBoard.articles.files.index(userConnection, {
      articleId: article.id,
      body: {
        page: 2,
        limit: smallPageSize satisfies number as number,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit",
    page2Response.pagination.limit,
    smallPageSize,
  );
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    fileCount,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2Response.pagination.pages,
    Math.ceil(fileCount / smallPageSize),
  );
  // Verify files belong to the correct article
  page2Response.data.forEach((fileSummary) => {
    const matchingFile = files.find((f) => f.id === fileSummary.id);
    TestValidator.predicate(
      "file belongs to article",
      () => matchingFile !== undefined,
    );
  });
}
// Helper function to get file extension from MIME type
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
  };
  return extensions[mimeType] ?? "bin";
}
