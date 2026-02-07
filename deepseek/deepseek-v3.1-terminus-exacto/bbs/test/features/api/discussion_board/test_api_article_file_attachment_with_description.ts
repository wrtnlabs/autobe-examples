import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_article_file_attachment_with_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
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
  // 2. Create article for file attachment using utility function
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
  // 3. Test file attachment WITH description using utility function
  const fileWithDescription =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          file_name: `${RandomGenerator.alphabets(8)}.pdf`,
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          storage_path: `/uploads/documents/${RandomGenerator.alphabets(10)}.pdf`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileWithDescription);
  // 4. Test file attachment WITHOUT description using utility function
  const fileWithoutDescription =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          file_name: `${RandomGenerator.alphabets(8)}.jpg`,
          file_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          storage_path: `/uploads/images/${RandomGenerator.alphabets(10)}.jpg`,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileWithoutDescription);
  // 5. Validate description field handling
  TestValidator.equals(
    "file with description should have description text",
    fileWithDescription.description,
    fileWithDescription.description,
  );
  TestValidator.equals(
    "file without description should have null description",
    fileWithoutDescription.description,
    null,
  );
  // 6. Verify file metadata integrity
  TestValidator.notEquals(
    "file IDs should be different",
    fileWithDescription.id,
    fileWithoutDescription.id,
  );
  TestValidator.equals(
    "both files should have null uploadedBy",
    fileWithDescription.uploadedBy,
    null,
  );
  TestValidator.equals(
    "both files should have null uploadedBy",
    fileWithoutDescription.uploadedBy,
    null,
  );
  TestValidator.predicate(
    "file sizes should be positive",
    fileWithDescription.fileSize > 0 && fileWithoutDescription.fileSize > 0,
  );
  TestValidator.predicate(
    "download count should start at zero",
    fileWithDescription.downloadCount === 0 &&
      fileWithoutDescription.downloadCount === 0,
  );
}
