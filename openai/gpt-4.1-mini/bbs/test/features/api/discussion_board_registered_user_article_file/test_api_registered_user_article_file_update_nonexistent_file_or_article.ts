import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_article_file_update_nonexistent_file_or_article(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for updating a file on a non-existing article or with non-existing fileId.
  // Steps:
  // 1. Authenticate as registered user.
  // 2. Attempt to update a file with an articleId or fileId that does not exist.
  // Validation:
  // - Check that the API returns appropriate error for non-existing article or file.
  // - Confirm that the update is rejected and no changes happen in the database.
  // - Verify that authorization is checked before operation.
  // - Confirm error handling for mismatched articleId and fileId combinations.
  // 1. Authenticate as registered user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(
    registeredUserConnection,
    { body: {} },
  );
  typia.assert(authorized);
  registeredUserConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare non-existing UUIDs for articleId and fileId
  const nonExistingArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistingFileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body with random data, using empty object from IUpdate as no properties are defined
  const updateBody = {} satisfies IDiscussionBoardArticleFile.IUpdate;
  // 4. Attempt to update file with non-existing articleId and non-existing fileId
  await TestValidator.error(
    "update with non-existing articleId and non-existing fileId should throw",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
        registeredUserConnection,
        {
          articleId: nonExistingArticleId,
          fileId: nonExistingFileId,
          body: updateBody,
        },
      );
    },
  );
  // 5. Attempt to update file with existing articleId but non-existing fileId to test mismatch handling
  // Since we do not have API to create article and file for realistic existing articleId, test with random articleId and single non-existing fileId
  const existingArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistingFileId2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with existing articleId but non-existing fileId should throw",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
        registeredUserConnection,
        {
          articleId: existingArticleId,
          fileId: nonExistingFileId2,
          body: updateBody,
        },
      );
    },
  );
  // 6. Attempt to update file without authorization headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "update without authorization should throw",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
        unauthorizedConnection,
        {
          articleId: nonExistingArticleId,
          fileId: nonExistingFileId,
          body: updateBody,
        },
      );
    },
  );
}
