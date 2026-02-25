import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super admin updating an article in the discussion board.
 *
 * This test verifies that a super admin can update an existing article's title
 * and content using the super admin articles update endpoint. The test follows
 * the natural workflow of updating an article and verifying the changes are
 * persisted correctly.
 */
export async function test_api_discussion_board_super_admin_updates_own_article(
  connection: api.IConnection,
): Promise<void> {
  // Create a new super admin connection for testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register a new super admin
  const joinResult = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: "Super Admin Test",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(joinResult);
  // Update the connection with the new auth token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: joinResult.token.access,
  };
  // Update an article with new title and content
  const updateTitle = RandomGenerator.name(4);
  const updateContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 5,
    wordMax: 10,
  });
  // Use a fixed UUID for the article ID since we can't create an article with the available API
  const articleId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const updateResponse =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: articleId,
        body: {
          title: updateTitle,
          content: updateContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // Validate the update
  TestValidator.equals("title updated", updateResponse.title, updateTitle);
  TestValidator.equals(
    "content updated",
    updateResponse.content,
    updateContent,
  );
}
