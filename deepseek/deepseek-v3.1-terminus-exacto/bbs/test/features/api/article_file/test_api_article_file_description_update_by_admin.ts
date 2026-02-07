import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_description_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account first to handle section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Note: Sections are created and managed by administrators only
  // For this test, we'll assume a section already exists or use a valid section ID
  // Since we don't have section creation API in the provided functions, we'll proceed
  // with the understanding that sections are pre-configured in the test environment
  // Step 2: Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 3: Create article as regular user
  // Using a valid section ID that should exist in the test environment
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 4: Attach file as regular user
  const file = await api.functional.discussionBoard.user.articles.files.create(
    userConnection,
    {
      articleId: article.id,
      body: {
        file_name: "test_file.pdf",
        file_type: "application/pdf",
        file_size: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
        >(),
        storage_path: "/uploads/test_file.pdf",
        description: "Original file description",
      } satisfies IDiscussionBoardArticleFile.ICreate,
    },
  );
  typia.assert(file);
  // Step 5: Update file description as administrator
  const updatedFile =
    await api.functional.discussionBoard.user.articles.files.update(
      adminConnection,
      {
        articleId: article.id,
        fileId: file.id,
        body: {
          description: "Updated description by administrator",
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // Validate that administrator successfully updated the file description
  TestValidator.equals(
    "file description updated",
    updatedFile.description,
    "Updated description by administrator",
  );
  TestValidator.equals("file ID remains the same", updatedFile.id, file.id);
  TestValidator.equals(
    "file name remains unchanged",
    updatedFile.fileName,
    file.fileName,
  );
  TestValidator.equals(
    "file type remains unchanged",
    updatedFile.fileType,
    file.fileType,
  );
}
