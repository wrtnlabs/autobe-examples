import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_articles_files_create } from "../../../generate/generate_random_discussion_board_articles_files_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_discussionboard_article_file_upload(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.IJoin;
  const memberAuth = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    { body: memberCredentials },
  );
  typia.assert(memberAuth);
  // Step 2: Create an article
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Upload file to the article
  const file = await api.functional.discussionBoard.articles.files.create(
    memberConnection,
    {
      articleId: article.id,
      body: {
        originalFilename: "test_document.pdf",
        mimeType: "application/pdf",
      } satisfies IDiscussionBoardArticleFile.ICreate,
    },
  );
  typia.assert(file);
  // Step 4: Validate file metadata
  TestValidator.equals(
    "file is associated with article",
    file.article_id,
    article.id,
  );
  TestValidator.equals(
    "filename matches",
    file.original_filename,
    "test_document.pdf",
  );
  TestValidator.equals("MIME type matches", file.mime_type, "application/pdf");
  TestValidator.predicate("file has valid size", file.file_size >= 0);
  // Cleanup: Skip file deletion as 'delete' method is not available
}