import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
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

export async function test_api_admin_comments_queue_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin joins the system
  const adminData = typia.random<IRedditPlatformAdmin.IJoin>();
  const adminResult = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(adminResult);
  // Retrieve comment moderation queue
  const result =
    await api.functional.redditPlatform.admin.comments.queue.index(
      adminConnection,
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination != null, true);
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  // Validate data array
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // Validate comment structure if data exists
  if (result.data.length > 0) {
    const firstComment = result.data[0];
    typia.assert(firstComment);
  }
}