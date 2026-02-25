import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_files_update_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join and login a registered user
  const registeredUserJoinBody: Partial<IDiscussionBoardRegisteredUser.IJoin> =
    {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    };
  const registeredUserAuthorized = await authorize_registered_user_join(
    { host: connection.host },
    { body: registeredUserJoinBody },
  );
  typia.assert(registeredUserAuthorized);
  const registeredUserConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(registeredUserConnection, {
    body: {
      email: registeredUserJoinBody.email!,
      password: registeredUserJoinBody.password!,
    } satisfies IDiscussionBoardRegisteredUser.ILogin,
  });
  // 2. Registered user creates an article
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {
        body: {
          title: "Test Article Title",
          content: "This is a test content of the article.",
          sectionId: "default-section-id",
          attachments: [
            {
              fileName: "original.txt",
              fileType: "text/plain",
              fileSize: 1024,
              downloadUrl: "http://example.com/original.txt",
              displayOrder: 0,
            },
          ],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Verify current state of article files
  const originalFiles = article.files;
  typia.assert(originalFiles);
  TestValidator.predicate(
    "article has at least one file",
    originalFiles.length > 0,
  );
  // 4. Attempt unauthorized update to article files without super administrator auth
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Will not set authorization header to simulate unauthorized access
  // Prepare file update body
  const updateBody: IDiscussionBoardArticleFile.IUpdate = {
    fileName: "updated.txt",
    fileType: "text/plain",
    fileSize: 2048,
    downloadUrl: "http://example.com/updated.txt",
    displayOrder: 1,
  };
  // Attempt to update with unauthorized connection
  await TestValidator.httpError(
    "unauthorized user forbidden to update article files",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.files.updateFiles(
        unauthorizedConnection,
        { articleId: article.id, body: updateBody },
      );
    },
  );
  // 5. Original files remain unchanged by assumption of authorization enforcement
}
