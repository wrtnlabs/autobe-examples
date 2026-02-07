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

export async function test_api_user_article_file_deletion_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create first user (User A)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: "user_a@test.com",
      password: "password123",
      display_name: "User A",
      bio: "Test user A",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create second user (User B)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: "user_b@test.com",
      password: "password123",
      display_name: "User B",
      bio: "Test user B",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User B creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    userBConnection,
    {
      body: {
        title: "Test Article",
        content:
          "This is a test article content with sufficient length to meet requirements.",
        section_id: "00000000-0000-0000-0000-000000000000",
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  // User B attaches a file to their article
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      userBConnection,
      {
        body: {
          file_name: "test_file.txt",
          file_type: "text/plain",
          file_size: 100,
          storage_path: "/uploads/test_file.txt",
          description: "Test file attachment",
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  // User A attempts to delete User B's file attachment - should fail
  try {
    await api.functional.discussionBoard.user.articles.files.erase(
      userAConnection,
      {
        articleId: article.id,
        fileId: file.id,
      },
    );
    throw new Error("Expected permission error but deletion succeeded");
  } catch (error) {
    // Expected - permission should be denied
  }
  // Test edge case: non-existent article ID
  try {
    await api.functional.discussionBoard.user.articles.files.erase(
      userAConnection,
      {
        articleId: "00000000-0000-0000-0000-000000000000",
        fileId: file.id,
      },
    );
    throw new Error(
      "Expected error for non-existent article but operation succeeded",
    );
  } catch (error) {
    // Expected - article not found
  }
  // Test edge case: non-existent file ID
  try {
    await api.functional.discussionBoard.user.articles.files.erase(
      userAConnection,
      {
        articleId: article.id,
        fileId: "00000000-0000-0000-0000-000000000000",
      },
    );
    throw new Error(
      "Expected error for non-existent file but operation succeeded",
    );
  } catch (error) {
    // Expected - file not found
  }
}
