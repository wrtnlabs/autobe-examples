import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_article_files_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to establish session
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(auth);
  // 2. Attempt to access files for a random non-existent article
  // This tests access control - guest should not be able to access
  // non-existent or restricted articles' files
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const files = await api.functional.discussionBoard.guest.articles.files.index(
    guestConnection,
    {
      articleId: randomArticleId,
    },
  );
  typia.assert(files);
  // 3. Validate response structure (empty list for non-existent article)
  TestValidator.equals("pagination exists", files.pagination !== null, true);
  TestValidator.equals(
    "empty data for non-existent article",
    files.data.length,
    0,
  );
}
