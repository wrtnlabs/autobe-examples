import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Scenario 2: Attempt to retrieve an article using a non-existent articleId.
 * The test will authenticate as an administrator, then execute the get operation
 * with a random UUID that does not match any article record.
 * The expected outcome is a 404 Not Found error.
 * This ensures that the system properly handles requests for missing resources
 * with appropriate error codes.
 */
export async function test_api_discussion_board_article_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and acquires authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password12345!",
      },
    });
  // Overwrite to authorization header
  adminConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 2. Attempt to retrieve article using random UUID that does not exist
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect HttpError with status 404 Not Found
  await TestValidator.httpError(
    "article not found returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.at(
        adminConnection,
        {
          articleId: randomArticleId,
        },
      );
    },
  );
}
