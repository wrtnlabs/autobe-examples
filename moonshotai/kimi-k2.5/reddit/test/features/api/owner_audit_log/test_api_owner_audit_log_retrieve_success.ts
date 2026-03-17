import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwnerAuditLog";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test owner audit log retrieval success case.
 * Validates that an authorized owner can retrieve a specific audit log entry
 * with complete data validation including action, entity info, request metadata,
 * and owner summary details.
 *
 * Flow:
 * 1. Authenticate as member
 * 2. Create community to generate activity
 * 3. Authenticate as owner
 * 4. List audit logs to obtain a valid auditLogId
 * 5. Retrieve specific audit log entry
 * 6. Validate complete response structure
 */
export async function test_api_owner_audit_log_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create community to generate activity context
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1).replace(/\s+/g, "_"),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  // 3. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {},
  });
  // 4. List audit logs to get a valid auditLogId
  const auditLogsPage: IPageIRedditLikeOwnerAuditLog.ISummary =
    await api.functional.redditLike.owner.audit_logs.index(ownerConnection, {
      body: {
        limit: 10,
      } satisfies IRedditLikeOwnerAuditLog.IRequest,
    });
  typia.assert(auditLogsPage);
  // Verify audit logs exist and get first entry ID
  const firstAuditLog = auditLogsPage.data[0];
  if (firstAuditLog === undefined) {
    throw new Error("No audit logs found in the system");
  }
  const auditLogId = firstAuditLog.id;
  // 5. Retrieve specific audit log entry by ID
  const auditLog: IRedditLikeOwnerAuditLog =
    await api.functional.redditLike.owner.audit_logs.at(ownerConnection, {
      auditLogId,
    });
  typia.assert(auditLog);
}
