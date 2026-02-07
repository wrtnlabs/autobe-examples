import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_file_download_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestResponse = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(guestResponse);
  // 2. Try to download a non-existent file with valid article ID but non-existent file ID
  // Create a valid article ID but use a random non-existent file ID
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent file download fails", async () => {
    await api.functional.discussionBoard.guest.articles.files.download(
      guestConnection,
      {
        articleId: randomArticleId,
        fileId: nonExistentFileId,
      },
    );
  });
}
