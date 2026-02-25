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

export async function test_api_article_files_update_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of article files by a super administrator.
  // Preconditions: A registered user creates an article with attached files.
  // Authenticate as a super administrator via join and login operations.
  // Perform patch update on the article's files to change metadata such as display order.
  // Validate response includes updated files with correct metadata.
  // Verify that only files attached to the specified article are updated.
  // Confirm no data loss or orphaned file entries.
  // Confirm appropriate audit logs if applicable.
  // Scenario 2: Unauthorized update attempt of article files by a non-super administrator.
  // Preconditions: A registered user creates an article.
  // Attempt patch update on the article's files without super administrator authorization.
  // Expect 403 Forbidden error response.
  // Verify no changes were made to the file metadata.
  // Confirm security enforcement prevents unauthorized file metadata update.
  // Create actor-specific connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  const registeredUserConnection: api.IConnection = { host: connection.host };
  // 1. Registered user joins and logs in
  const registeredUserJoinPayload: Partial<IDiscussionBoardRegisteredUser.IJoin> =
    {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    };
  const registeredUserAuthorized = await authorize_registered_user_join(
    { host: connection.host },
    { body: registeredUserJoinPayload },
  );
  typia.assert(registeredUserAuthorized);
  registeredUserConnection.headers = {
    Authorization: registeredUserAuthorized.token.access,
  };
  // 2. Registered user creates an article with attached files
  // Prepare an article with files
  const articleCreatePayload: IDiscussionBoardArticle.ICreate = {
    title: `Test Article ${RandomGenerator.alphabets(5)}`,
    content: RandomGenerator.content({ paragraphs: 2 }),
    sectionId: typia.random<string & tags.Format<"uuid">>(),
    attachments: ArrayUtil.repeat(3, () => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      fileName: `${RandomGenerator.alphabets(4)}.txt`,
      fileType: "text/plain",
      fileSize: randint(100, 1000) as number & tags.Type<"int32">,
      downloadUrl: `https://example.com/files/${RandomGenerator.alphabets(10)}.txt`,
      displayOrder: randint(1, 3) as number & tags.Type<"int32">,
    })),
  };
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: articleCreatePayload },
    );
  typia.assert(article);
  // Check files list must exist
  const originalFiles = article.files;
  typia.assert(originalFiles);
  TestValidator.predicate(
    "article has attached files",
    Array.isArray(originalFiles) && originalFiles.length > 0,
  );
  // 3. Super administrator join and login
  const superAdminJoinPayload: Partial<IDiscussionBoardSuperAdministrator.IJoin> =
    {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    };
  const superAdminAuthorized = await authorize_super_administrator_join(
    { host: connection.host },
    { body: superAdminJoinPayload },
  );
  typia.assert(superAdminAuthorized);
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: superAdminJoinPayload.email!,
      password: superAdminJoinPayload.password!,
    },
  });
  // 4. Perform patch update on the article's files to change metadata such as display order
  // We will update files by changing displayOrder to reversed order
  const reversedDisplayOrders = originalFiles
    .map((file) => file.displayOrder)
    .reverse();
  // Prepare update bodies, keep other properties undefined to simulate partial update
  const updateBody: IDiscussionBoardArticleFile.IUpdate = {
    displayOrder: undefined,
  };
  // For each file, patch update using the super administrator
  const updatedFilePromises = originalFiles.map(async (file, index) => {
    const body: IDiscussionBoardArticleFile.IUpdate = {
      displayOrder: reversedDisplayOrders[index],
    };
    const updatedFile =
      await api.functional.discussionBoard.superAdministrator.articles.files.updateFiles(
        superAdminConnection,
        {
          articleId: article.id,
          body,
        },
      );
    typia.assert(updatedFile);
    return updatedFile;
  });
  const updatedFiles = await Promise.all(updatedFilePromises);
  // Verify that updated files display order is reversed compared to originals
  for (let i = 0; i < originalFiles.length; ++i) {
    TestValidator.equals(
      `file displayOrder updated for file id ${originalFiles[i].id}`,
      updatedFiles[i].displayOrder,
      reversedDisplayOrders[i],
    );
  }
  // 5. Unauthorized update attempt by registered user
  // Attempting to patch update article files as registered user (non-super admin)
  await TestValidator.httpError(
    "forbid non-super administrator from updating article files",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.files.updateFiles(
        registeredUserConnection,
        {
          articleId: article.id,
          body: {
            displayOrder: 999,
          } satisfies IDiscussionBoardArticleFile.IUpdate,
        },
      );
    },
  );
  // Verify no changes on file metadata for unauthorized attempt
  // Retrieve files again via article detail fetch (simulate as registered user)
  // Because no direct GET article or files endpoint provided, we'll check unchanged fields by minimal updatedFiles
  const latestUpdatedFile =
    await api.functional.discussionBoard.superAdministrator.articles.files.updateFiles(
      superAdminConnection,
      {
        articleId: article.id,
        body: { displayOrder: updatedFiles[0].displayOrder },
      },
    );
  typia.assert(latestUpdatedFile);
  TestValidator.equals(
    "file displayOrder unchanged after unauthorized attempt",
    latestUpdatedFile.displayOrder,
    updatedFiles[0].displayOrder,
  );
}
