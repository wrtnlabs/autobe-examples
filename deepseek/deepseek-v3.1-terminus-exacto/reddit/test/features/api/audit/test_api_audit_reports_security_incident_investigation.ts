import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_bans_create } from "../../../generate/generate_random_community_platform_moderator_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_audit_reports_security_incident_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication for investigation access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Generate regular user audit data
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(user);
  // 3. Generate moderator audit data
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "mod1234",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    },
  });
  typia.assert(moderator);
  // 4. Generate moderator ban action audit entries
  // Note: Need a community ID for ban creation, but not available in DTOs
  // Since community creation endpoint not provided, we'll skip this dependency
  // and focus on audit report filtering with available data
  // Record start time for date range filtering
  const investigationStart = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  // 5. Test audit report filtering for security incident investigation
  // a) Date range filtering to focus on incident timeframe
  const dateFiltered =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      {
        body: {
          start_date: investigationStart,
          end_date: new Date().toISOString(),
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filtered results contain pagination",
    dateFiltered.pagination !== undefined,
  );
  // b) Filter by success=false to find failed login attempts
  const failedOperations =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      {
        body: {
          success: false,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(failedOperations);
  // c) Filter by specific action types
  const loginActions =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      {
        body: {
          action_type: "login",
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(loginActions);
  // d) Test pagination with small limit
  const paginated =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination limit respected",
    paginated.data.length <= paginated.pagination.limit,
  );
  // e) Combine multiple filter criteria
  const combinedFilter =
    await api.functional.communityPlatform.admin.audit_reports.index(
      adminConnection,
      {
        body: {
          start_date: investigationStart,
          success: true,
          actor_type: "user",
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 6. Validate audit summary structure (sensitive details protected)
  if (combinedFilter.data.length > 0) {
    const sampleAudit = combinedFilter.data[0];
    TestValidator.equals(
      "audit summary contains essential fields",
      typeof sampleAudit.id,
      "string",
    );
    TestValidator.equals(
      "audit summary contains actor_type",
      typeof sampleAudit.actor_type,
      "string",
    );
    TestValidator.equals(
      "audit summary contains action_type",
      typeof sampleAudit.action_type,
      "string",
    );
    TestValidator.predicate(
      "audit summary contains boolean success flag",
      typeof sampleAudit.success === "boolean",
    );
    TestValidator.equals(
      "audit summary contains ip_address",
      typeof sampleAudit.ip_address,
      "string",
    );
    TestValidator.equals(
      "audit summary contains created_at",
      typeof sampleAudit.created_at,
      "string",
    );
  }
}
