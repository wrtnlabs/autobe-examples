import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_article_file_deletion_authorization_and_success(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  /**
   * Scenario 1: Authorized registered user deletes a file attached to their own article.
   */
  // Setup registered user and login
  const regUserJoinConnection: api.IConnection = { host: connection.host };
  const regUser = await authorize_registered_user_join(regUserJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  const regUserConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(regUserConnection, {
    body: { email: regUser.email, password: "Password123!" },
  });
  // Create articleId and fileIds
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const fileId1 = typia.random<string & tags.Format<"uuid">>();
  const fileId2 = typia.random<string & tags.Format<"uuid">>();
  // Registered user deletes fileId1 from their own article
  await api.functional.discussionBoard.registeredUser.articles.files.eraseFile(
    regUserConnection,
    {
      articleId,
      fileId: fileId1,
    },
  );
  // Deletion repeated should cause error (file no longer exists)
  await TestValidator.error(
    "deleting already deleted file should fail",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.eraseFile(
        regUserConnection,
        {
          articleId,
          fileId: fileId1,
        },
      );
    },
  );
  /**
   * Scenario 2: Administrator deletes a file attached to any user's article.
   */
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
    },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: "AdminPass123!",
      href: "https://localhost",
      referrer: "https://localhost/ref",
    },
  });
  // Administrator deletes fileId2 from registered user's article
  await api.functional.discussionBoard.registeredUser.articles.files.eraseFile(
    adminConnection,
    {
      articleId,
      fileId: fileId2,
    },
  );
  /**
   * Scenario 3: Unauthorized user attempts to delete a file on an article they do not own.
   */
  // Setup two registered users: userA and userB
  const userAJoinConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_registered_user_join(userAJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password321!",
    },
  });
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(userAConnection, {
    body: { email: userA.email, password: "Password321!" },
  });
  const userBJoinConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_registered_user_join(userBJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password654!",
    },
  });
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(userBConnection, {
    body: { email: userB.email, password: "Password654!" },
  });
  // userB article and file
  const userBArticleId = typia.random<string & tags.Format<"uuid">>();
  const userBFileId = typia.random<string & tags.Format<"uuid">>();
  // userA tries to delete file of userB's article - should fail with 403
  await TestValidator.error(
    "unauthorized user deleting another user's file should fail",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.eraseFile(
        userAConnection,
        {
          articleId: userBArticleId,
          fileId: userBFileId,
        },
      );
    },
  );
}
