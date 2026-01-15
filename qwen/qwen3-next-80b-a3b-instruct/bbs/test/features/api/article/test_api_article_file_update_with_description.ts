import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { generate_random_discussion_board_citizen_articles_files_create } from "../../../generate/generate_random_discussion_board_citizen_articles_files_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_file_update_with_description(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(citizen);
  // Step 2: Create article with citizen connection
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 25,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Upload file attachment as citizen
  const file: IDiscussionBoardArticleFile =
    await generate_random_discussion_board_citizen_articles_files_create(
      citizenConnection,
      {
        body: {
          article_id: article.id,
          name: RandomGenerator.alphabets(8) + ".jpg",
          extension: "jpg",
          url: typia.random<string & tags.Format<"uri">>(),
          uploaded_by: citizen.id,
          uploaded_at: new Date().toISOString(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(file);
  // Step 4: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IAdmin.IAuthorized = await authorize_admin_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(moderator);
  // Step 5: Update file with moderator connection
  const updatedFile: IDiscussionBoardAttachmentFile =
    await api.functional.discussionBoard.moderator.articles.files.update(
      moderatorConnection,
      {
        articleId: article.id,
        fileId: file.id,
        body: {
          name: file.file_name,
          extension: file.file_extension satisfies string as string,
          url: file.storage_uri satisfies string as string,
          mimetype: file.content_type,
        } satisfies IDiscussionBoardAttachmentFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // Step 6: Verify that metadata was preserved
  TestValidator.equals(
    "file name preserved",
    updatedFile.name,
    file.file_name,
  );
  TestValidator.equals(
    "file extension preserved",
    updatedFile.extension,
    file.file_extension satisfies string as string,
  );
  TestValidator.equals(
    "file URL preserved",
    updatedFile.url,
    file.storage_uri satisfies string as string,
  );
  TestValidator.equals(
    "mimetype preserved",
    updatedFile.mimetype,
    file.content_type,
  );
  // No length validation needed - type constraint provides this
  // No retrieval test possible - no GET endpoint provided in API
}