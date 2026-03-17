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

export async function test_api_owner_audit_log_owner_metadata_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as owner via POST /redditLike/auth/owner/join
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create a community via POST /redditLike/member/communities to trigger audit log
  // Owner accounts have member capabilities for this operation
  await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {},
  );
  // Step 3: Retrieve audit logs list via PATCH /redditLike/owner/audit-logs
  const auditLogsResponse =
    await api.functional.redditLike.owner.audit_logs.index(ownerConnection, {
      body: {} satisfies IRedditLikeOwnerAuditLog.IRequest,
    });
  typia.assert(auditLogsResponse);
  // Get first audit log from list
  const auditLogSummary = auditLogsResponse.data[0];
  typia.assertGuard(auditLogSummary);
  // Step 4: Call target endpoint GET /redditLike/owner/audit-logs/{auditLogId}
  const auditLog = await api.functional.redditLike.owner.audit_logs.at(
    ownerConnection,
    {
      auditLogId: auditLogSummary.id,
    },
  );
  typia.assert(auditLog);
  // Step 5: Validate owner nested object metadata integrity
  TestValidator.equals(
    "owner id matches authenticated owner",
    auditLog.owner.id,
    owner.id,
  );
  TestValidator.equals(
    "owner username matches",
    auditLog.owner.username,
    owner.username,
  );
  TestValidator.equals(
    "owner displayName matches",
    auditLog.owner.displayName,
    owner.display_name,
  );
  TestValidator.equals(
    "owner email matches",
    auditLog.owner.email,
    owner.email,
  );
  TestValidator.equals(
    "owner isActive is true",
    auditLog.owner.isActive,
    owner.is_active,
  );
}
