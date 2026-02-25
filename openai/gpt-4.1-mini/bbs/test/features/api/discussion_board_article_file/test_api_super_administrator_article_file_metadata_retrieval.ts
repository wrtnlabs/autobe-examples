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
import { generate_random_discussion_board_registered_user_articles_files_create_file } from "../../../generate/generate_random_discussion_board_registered_user_articles_files_create_file";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_super_administrator_article_file_metadata_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup registeredUser connection and join/login with fixed password
  const registeredUserPassword = "User#Password123";
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUserAuthorized = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: { password: registeredUserPassword },
    },
  );
  typia.assert(registeredUserAuthorized);
  const registeredUserLogin = await authorize_registered_user_login(
    registeredUserConnection,
    {
      body: {
        email: registeredUserAuthorized.email,
        password: registeredUserPassword,
      },
    },
  );
  typia.assert(registeredUserLogin);
  // 2. Create article as registeredUser
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Attach file to article as registeredUser
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      registeredUserConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(file);
  // 4. Setup superAdministrator connection and join/login with fixed password
  const superAdminPassword = "SuperAdmin#Password123";
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: { password: superAdminPassword },
    },
  );
  typia.assert(superAdminJoin);
  const superAdminLogin = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: { email: superAdminJoin.email, password: superAdminPassword },
    },
  );
  typia.assert(superAdminLogin);
  // 5. Retrieve file metadata as superAdministrator
  const retrievedFile =
    await api.functional.discussionBoard.superAdministrator.articles.files.atFile(
      superAdminConnection,
      {
        articleId: article.id,
        fileId: file.id,
      },
    );
  typia.assert(retrievedFile);
  // 6. Validate retrieved metadata fields
  TestValidator.equals("file id matches", retrievedFile.id, file.id);
  TestValidator.equals(
    "article id matches",
    retrievedFile.articleId,
    article.id,
  );
  TestValidator.equals(
    "file name matches",
    retrievedFile.fileName,
    file.fileName,
  );
  TestValidator.equals(
    "file type matches",
    retrievedFile.fileType,
    file.fileType,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.fileSize,
    file.fileSize,
  );
  TestValidator.equals(
    "download URL matches",
    retrievedFile.downloadUrl,
    file.downloadUrl,
  );
  TestValidator.equals(
    "display order matches",
    retrievedFile.displayOrder,
    file.displayOrder,
  );
  TestValidator.equals(
    "createdAt matches",
    retrievedFile.createdAt,
    file.createdAt,
  );
  TestValidator.equals(
    "updatedAt matches",
    retrievedFile.updatedAt,
    file.updatedAt,
  );
  TestValidator.equals(
    "deletedAt matches",
    retrievedFile.deletedAt,
    file.deletedAt ?? null,
  );
  // 7. Test unauthorized retrieval with wrong articleId
  await TestValidator.error("retrieve with wrong articleId", async () => {
    await api.functional.discussionBoard.superAdministrator.articles.files.atFile(
      superAdminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        fileId: file.id,
      },
    );
  });
  // 8. Test unauthorized retrieval with wrong fileId
  await TestValidator.error("retrieve with wrong fileId", async () => {
    await api.functional.discussionBoard.superAdministrator.articles.files.atFile(
      superAdminConnection,
      {
        articleId: article.id,
        fileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
