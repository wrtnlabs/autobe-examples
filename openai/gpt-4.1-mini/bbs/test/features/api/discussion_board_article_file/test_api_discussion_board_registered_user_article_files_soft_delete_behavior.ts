import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { ArrayUtil, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";

export async function test_api_discussion_board_registered_user_article_files_soft_delete_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate and join as a registered user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {},
    },
  );
  registeredUserConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new article without files
  const article =
    (await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {},
    )) as { id: string };
  typia.assert(article);
  // 3. Create 2 file patches with generated UUIDs; first file soft deleted with deleted_at timestamp; second file not deleted
  const deletedAtTimestamp = new Date().toISOString();
  const filePatches: Array<{ id: string & tags.Format<"uuid">; deleted_at: string | null }> = ArrayUtil.repeat(
    2,
    (index) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      deleted_at: index === 0 ? deletedAtTimestamp : null,
    }),
  );
  // 4. Patch article files with soft deletion status of files
  const response =
    await api.functional.discussionBoard.registeredUser.articles.files.index(
      registeredUserConnection,
      {
        articleId: article.id,
        body: filePatches,
      },
    );
  typia.assert(response);
  // 5. Validate that the patched files in the response match the deleted_at statuses we sent
  for (const file of response.data as Array<{ id: string & tags.Format<"uuid">; deleted_at: string | null }>) {
    const patch = filePatches.find((p) => p.id === file.id);
    if (patch) {
      TestValidator.equals(
        `File ${file.id} deleted_at should match the patch value`,
        file.deleted_at,
        patch.deleted_at,
      );
    }
  }
}
