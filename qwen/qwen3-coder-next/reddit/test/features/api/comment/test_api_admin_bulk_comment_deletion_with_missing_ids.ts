import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_bulk_comment_deletion_with_missing_ids(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  // 2. Generate a list of comment IDs including some non-existent ones
  const commentIds: string[] = [];
  commentIds.push(typia.random<string & tags.Format<"uuid">>());
  commentIds.push(typia.random<string & tags.Format<"uuid">>());
  commentIds.push(typia.random<string & tags.Format<"uuid">>());
  commentIds.push(typia.random<string & tags.Format<"uuid">>());
  // 3. Perform bulk delete with non-existent comment IDs
  const response: IRedditPlatformComment.IBulkDeleteResponse =
    await api.functional.redditPlatform.admin.comments.bulk_delete.eraseBulk(
      adminConnection,
      {
        body: commentIds,
      },
    );
  typia.assert(response);
  // 4. Verify response structure (empty response means success)
  // Since response is empty object, we just verify it's valid JSON
  TestValidator.predicate("response is valid", typeof response === "object");
}
