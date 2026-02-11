import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLog";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_audit_logs_moderator_time_range_pagination_max(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.access_token}`,
  };
  // 2. Wait briefly to allow audit log generation
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Define time range for audit logs (last 24 hours)
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // 4. Request audit logs with maximum pagination (100 records)
  const auditLogs = await api.functional.redditCommunity.audit_logs.index(
    moderatorConnection,
    {
      body: {
        created_at_from: twentyFourHoursAgo.toISOString(),
        created_at_to: now.toISOString(),
        limit: 100,
      },
    },
  );
  typia.assert(auditLogs);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination limit is 100",
    auditLogs.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    auditLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    auditLogs.pagination.pages >= 0,
  );
  // 6. Validate that logs are sorted by created_at descending
  if (auditLogs.data.length > 1) {
    for (let i = 0; i < auditLogs.data.length - 1; i++) {
      const current = new Date(auditLogs.data[i].created_at);
      const next = new Date(auditLogs.data[i + 1].created_at);
      TestValidator.predicate(
        "logs sorted descending by created_at",
        current >= next,
      );
    }
  }
  // 7. Validate time range constraint
  for (const log of auditLogs.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log within time range",
      logDate >= twentyFourHoursAgo && logDate <= now,
    );
  }
  // 8. Validate that exactly 100 records returned if available
  // Note: We cannot guarantee there are 100+ audit logs in the time range,
  // so we validate that we received at most 100 and that limit was respected
  TestValidator.predicate(
    "fetched at most 100 logs",
    auditLogs.data.length <= 100,
  );
  // 9. Validate that each log has valid structure
  for (const log of auditLogs.data) {
    TestValidator.equals("log has id", typeof log.id, "string");
    TestValidator.predicate(
      "log has valid id format",
      /^[0-9a-f-]{36}$/i.test(log.id),
    );
    TestValidator.equals(
      "log has action",
      ["login", "logout", "password_change", "account_deletion"].includes(
        log.action,
      ),
      true,
    );
    TestValidator.equals("log has ip_address", typeof log.ip_address, "string");
    TestValidator.predicate(
      "log has valid ipv4 format",
      /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(
        log.ip_address,
      ),
    );
    TestValidator.equals("log has created_at", typeof log.created_at, "string");
    TestValidator.predicate(
      "log has valid date-time format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        log.created_at,
      ),
    );
  }
}
