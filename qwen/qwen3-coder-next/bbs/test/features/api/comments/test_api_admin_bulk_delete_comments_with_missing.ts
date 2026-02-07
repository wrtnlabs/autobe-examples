import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_bulk_delete_comments_with_missing(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection for comment deletion
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Generate random comment IDs: mix of valid and non-existent IDs
  const validComments = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const nonExistentComments = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Combine valid and non-existent IDs for bulk deletion
  const allCommentIds = [...validComments, ...nonExistentComments];
  // Execute bulk deletion with mixed valid/invalid IDs
  const result =
    await api.functional.discussionBoard.admin.deleted.comments.bulkErase(
      adminConnection,
      {
        body: { ids: allCommentIds } as IDiscussionBoardArticleComment.IRequest,
      },
    );
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate("has success flag", result !== null);
}
