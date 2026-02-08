import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_administrator_article_file_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // 2. Admin login to refresh token and have a fresh session (if needed)
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {},
  });
  typia.assert(adminLogin);
  // 3. Create a registered user who will be the article author
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // 4. User login
  const userLogin = await authorize_registered_user_login(userConnection, {
    body: {},
  });
  typia.assert(userLogin);
  // 5. As user, create an article with at least one file attached
  // Since there is no direct DTO or API for article and file creation in given info, we'll simulate articleId and fileId
  // We generate UUIDs for articleId and fileId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();
  // 6. Administrator updates the attached file metadata
  const updateBody = typia.random<IDiscussionBoardArticleFile.IUpdate>();
  const updatedFile =
    await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
      adminConnection,
      {
        articleId,
        fileId,
        body: updateBody,
      },
    );
  typia.assert(updatedFile);
  // 7. Verify the returned updated file matches the update body (where applicable)
  // Since we don't have detailed schema for IDiscussionBoardArticleFile.IUpdate and IDiscussionBoardArticleFile
  // We just assert the returned output is valid, no further property checks done
  // 8. Test invalid file update: using invalid fileId
  await TestValidator.error("invalid file update error", async () => {
    await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
      adminConnection,
      {
        articleId,
        fileId: "00000000-0000-0000-0000-000000000000",
        body: updateBody,
      },
    );
  });
  // 9. Test authorization rejection if connection is a registered user (not admin and not article author)
  // We use another user connection
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUserAuth = await authorize_registered_user_join(
    anotherUserConnection,
    { body: {} },
  );
  typia.assert(anotherUserAuth);
  const anotherUserLogin = await authorize_registered_user_login(
    anotherUserConnection,
    { body: {} },
  );
  typia.assert(anotherUserLogin);
  await TestValidator.error(
    "authorization rejection for non-admin non-author",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.updateFile(
        anotherUserConnection,
        {
          articleId,
          fileId,
          body: updateBody,
        },
      );
    },
  );
}
