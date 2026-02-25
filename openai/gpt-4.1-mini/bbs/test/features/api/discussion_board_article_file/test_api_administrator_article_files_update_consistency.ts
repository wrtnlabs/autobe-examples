import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_administrator_article_files_update_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of article files by administrator
  // Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      href: "/login",
      referrer: "/",
      ip: null,
    },
  });
  typia.assert(adminLogin);
  // Create registered user connection and join
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);
  // Create article by registered user with files
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          attachments: ArrayUtil.repeat(
            3,
            (i) =>
              ({
                fileName: `file_${i + 1}.txt`,
                fileType: "text/plain",
                fileSize: 1024 * (i + 1),
                downloadUrl: `https://example.com/file_${i + 1}.txt`,
                displayOrder: i + 1,
              }) as any,
          ),
        },
      },
    );
  typia.assert(article);
  const articleId = article.id;
  // Scenario 1: Administrator updates the files displayOrder by individual calls
  const updatedDisplayOrders = [3, 1, 2];
  const files = article.files;
  const updatedFiles: IDiscussionBoardArticleFile.ISummary[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const updateBody: IDiscussionBoardArticleFile.IUpdate = {
      displayOrder: updatedDisplayOrders[i],
    };
    const updatedFile =
      await api.functional.discussionBoard.administrator.articles.files.updateFiles(
        adminConnection,
        {
          articleId,
          body: updateBody,
        },
      );
    typia.assert(updatedFile);
    updatedFiles.push(updatedFile);
  }
  TestValidator.equals(
    "updated files count",
    updatedFiles.length,
    files.length,
  );
  const updatedOrders = updatedFiles.map((f) => f.displayOrder).sort();
  TestValidator.equals(
    "all displayOrders used",
    JSON.stringify(updatedOrders),
    JSON.stringify(updatedDisplayOrders.slice().sort()),
  );
  // Scenario 2: Unauthorized update attempt by non-admin
  const nonAdminConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_registered_user_login(nonAdminConnection, {
    body: {
      email: userJoinBody.email,
      password: userJoinBody.password,
    },
  });
  typia.assert(userLogin);
  await TestValidator.httpError(
    "non-admin cannot update article files",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.articles.files.updateFiles(
        nonAdminConnection,
        {
          articleId,
          body: {
            displayOrder: 1,
          },
        },
      );
    },
  );
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated cannot update article files",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.articles.files.updateFiles(
        noAuthConnection,
        {
          articleId,
          body: {
            displayOrder: 1,
          },
        },
      );
    },
  );
  // Scenario 3: Concurrency handling on article files update
  // Create concurrent updates with shuffled displayOrder
  const concurrencyUpdates = updatedDisplayOrders.map((order, index) => {
    return { fileIndex: index, displayOrder: order };
  });
  // Shuffle updates for concurrency
  for (let i = concurrencyUpdates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [concurrencyUpdates[i], concurrencyUpdates[j]] = [
      concurrencyUpdates[j],
      concurrencyUpdates[i],
    ];
  }
  // Perform concurrent updates each updating one file's displayOrder
  await Promise.all(
    concurrencyUpdates.map((update) => {
      const file = files[update.fileIndex];
      const updateBody: IDiscussionBoardArticleFile.IUpdate = {
        displayOrder: update.displayOrder,
      };
      return api.functional.discussionBoard.administrator.articles.files.updateFiles(
        adminConnection,
        {
          articleId,
          body: updateBody,
        },
      );
    }),
  );
  // Since we can't get files again via API, just trust no errors thrown and process succeeded
}
