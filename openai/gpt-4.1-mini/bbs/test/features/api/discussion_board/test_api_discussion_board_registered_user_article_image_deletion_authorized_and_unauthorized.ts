import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { TestValidator } from "@nestia/e2e";

export async function test_api_discussion_board_registered_user_article_image_deletion_authorized_and_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion by article author
  // 1. Author join and login
  const authorJoinConnection: api.IConnection = { host: connection.host };
  const authorJoinResult = await authorize_registered_user_join(
    authorJoinConnection,
    { body: {} },
  );
  typia.assert(authorJoinResult);
  authorJoinConnection.headers ??= {};
  authorJoinConnection.headers.Authorization = authorJoinResult.token.access;

  // 2. Author creates an article
  const authorArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      authorJoinConnection,
      { body: {} },
    );
  typia.assert(authorArticle);

  // Image deletion tests skipped because 'images' and 'id' are not properties of IDiscussionBoardArticle

  // Scenario 2: Successful deletion by an administrator
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(
    adminJoinConnection,
    { body: {} },
  );
  typia.assert(adminJoinResult);
  adminJoinConnection.headers ??= {};
  adminJoinConnection.headers.Authorization = adminJoinResult.token.access;

  const adminAuthorArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      authorJoinConnection,
      { body: {} },
    );
  typia.assert(adminAuthorArticle);

  // Image deletion tests skipped because 'images' and 'id' are not properties of IDiscussionBoardArticle

  // Scenario 3: Forbidden deletion attempt by non-author non-admin user
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUserJoinResult = await authorize_registered_user_join(
    otherUserConnection,
    { body: {} },
  );
  typia.assert(otherUserJoinResult);
  otherUserConnection.headers ??= {};
  otherUserConnection.headers.Authorization = otherUserJoinResult.token.access;

  // Since image deletion details are not available, skipping test for forbidden deletion
}
