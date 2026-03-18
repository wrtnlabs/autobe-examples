import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test activity log retrieval with various filters.
 *
 * 1. Authenticate as a member
 * 2. Create an organization
 * 3. Query activity logs with different filter combinations:
 *    - Action type filter (create)
 *    - Entity type filter (member, organization)
 *    - Date range filter
 * 4. Validate paginated response structure and actor polymorphism
 */
export async function test_api_activity_log_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 5,
          }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_year_start_month: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Query activity logs with action type filter
  const logsByAction =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: "create",
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(logsByAction);
  // 4. Query activity logs with entity type filter
  const logsByEntityType =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: null,
          entityType: ["member", "organization"],
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(logsByEntityType);
  // 5. Query activity logs with date range filter
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const logsByDateRange =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: now.toISOString(),
          sort: "created_at DESC",
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(logsByDateRange);
  // 6. Query activity logs with combined filters
  const logsWithCombinedFilters =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: ["create", "update"],
          entityType: "organization",
          entityId: null,
          actorMemberId: member.id,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: now.toISOString(),
          sort: "created_at DESC",
          page: 1,
          limit: 20,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(logsWithCombinedFilters);
  // 7. Validate pagination matches request parameters
  TestValidator.equals(
    "pagination current page matches request",
    logsWithCombinedFilters.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    logsWithCombinedFilters.pagination.limit,
    20,
  );
  // 8. Validate actor polymorphism if entries exist
  if (logsWithCombinedFilters.data.length > 0) {
    const firstLog = logsWithCombinedFilters.data[0];
    // Validate actor type discriminator
    TestValidator.predicate(
      "actor has valid type",
      firstLog.actor.type === "member" || firstLog.actor.type === "guest",
    );
    // Validate specific actor type properties
    if (firstLog.actor.type === "member") {
      TestValidator.predicate(
        "member actor has name",
        "name" in firstLog.actor,
      );
    } else {
      TestValidator.predicate(
        "guest actor has deviceFingerprint",
        "deviceFingerprint" in firstLog.actor,
      );
    }
  }
}
