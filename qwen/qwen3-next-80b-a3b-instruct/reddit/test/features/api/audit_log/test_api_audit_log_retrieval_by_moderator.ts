import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_audit_log_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Generate a valid UUID as the audit log ID
  const logId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log entry by valid UUID
  const retrievedLog = await api.functional.community.moderator.audit_logs.at(
    moderatorConnection,
    {
      logId,
    },
  );
  typia.assert(retrievedLog);
  // 4. Validate that the retrieved log has the correct structure
  // ICommunityAuditLog has no defined properties, so we can only verify it was returned
  TestValidator.predicate("log retrieved successfully", retrievedLog !== null);
}
