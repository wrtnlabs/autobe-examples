import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_files_post_by_articlecode } from "../../../generate/generate_random_discussion_board_member_articles_files_post_by_articlecode";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_file_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const member = await authorize_member_join(memberConnection, {
    body: {
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    },
  });
  // Step 2: Create article with valid title and content (min 50 chars)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  // Step 3: Upload article file with valid MIME type (PDF) and constraints
  const file =
    await generate_random_discussion_board_member_articles_files_post_by_articlecode(
      memberConnection,
      {
        params: {
          articleCode: article.code,
        },
        body: {
          mime_type: "application/pdf",
          size: 1024,
          name: "example.pdf",
          uri: "https://example.com/files/example.pdf",
          extension: "pdf",
        },
      },
    );
  // Step 4: Retrieve the file using articleCode and fileCode
  const retrievedFile =
    await api.functional.discussionBoard.member.articles.files.at(
      memberConnection,
      {
        articleCode: article.code,
        fileCode: file.file_code,
      },
    );
  // Step 5: Validate the retrieved file data
  typia.assert(retrievedFile);
  TestValidator.equals(
    "article code matches",
    retrievedFile.article_code,
    article.code,
  );
  TestValidator.equals(
    "file code matches",
    retrievedFile.file_code,
    file.file_code,
  );
  TestValidator.equals(
    "original filename matches",
    retrievedFile.original_filename,
    file.original_filename,
  );
  TestValidator.equals(
    "file content type matches",
    retrievedFile.mime_type,
    file.mime_type,
  );
  TestValidator.equals("file size matches", retrievedFile.size, file.size);
}
