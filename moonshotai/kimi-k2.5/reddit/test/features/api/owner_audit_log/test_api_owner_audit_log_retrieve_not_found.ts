import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_audit_log_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * This test validates that requesting a non-existent audit log ID returns an appropriate 404 error.
   * The test flow includes:
   * 1. Authenticate as owner via POST /redditLike/auth/owner/join
   * 2. Call the target endpoint GET /redditLike/owner/audit-logs/{auditLogId} with a randomly generated UUID
   * 3. Validate the system responds with HTTP 404 Not Found
   */
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {} satisfies DeepPartial<IRedditLikeOwner.IJoin>,
  });
  // 2. Generate a random UUID that doesn't exist in the database
  const nonExistentAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Try to retrieve the non-existent audit log and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent audit log",
    404,
    async () => {
      await api.functional.redditLike.owner.audit_logs.at(ownerConnection, {
        auditLogId: nonExistentAuditLogId,
      });
    },
  );
}
