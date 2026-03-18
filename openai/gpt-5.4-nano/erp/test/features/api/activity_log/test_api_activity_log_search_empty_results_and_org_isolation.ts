import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_activity_log_entries_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_activity_log_entries_create";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_activity_log_search_empty_results_and_org_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "P@ssw0rd!",
      organizationName: `org_${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const memberId = joined.id;
  // 2) Create second organization tenant
  const secondOrg =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(secondOrg);
  // 3) Create an activity log entry (known to exist in the other org)
  const actionTypeInSecondOrg = `action_${RandomGenerator.alphabets(12)}`;
  const occurredAtSecondOrg = new Date().toISOString();
  const createdEntrySecondOrg =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberConnection,
      {
        body: {
          action_type: actionTypeInSecondOrg,
          target_entity_type: "target_entity",
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          summary: `summary_${RandomGenerator.alphabets(12)}`,
          details: null,
          occurred_at: occurredAtSecondOrg,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.ICreate,
      },
    );
  typia.assert(createdEntrySecondOrg);
  // 4) Search with filters that match nothing (non-overlapping occurred_at and different actionType)
  const searchActionType = `action_${RandomGenerator.alphabets(12)}_no_match`;
  const fromMs = new Date(occurredAtSecondOrg).getTime() + 60 * 60 * 1000;
  const toMs = new Date(occurredAtSecondOrg).getTime() + 2 * 60 * 60 * 1000;
  const results =
    await api.functional.erpHrmTimeTracking.member.activityLogs.search(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: searchActionType,
          performedByMemberId: memberId,
          occurredAtFrom: new Date(fromMs).toISOString(),
          occurredAtTo: new Date(toMs).toISOString(),
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(results);
  // 5) Validate empty pagination response (and ensure no leaked entry)
  TestValidator.equals("activity log data is empty", results.data.length, 0);
  TestValidator.equals(
    "pagination records is zero",
    results.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is zero", results.pagination.pages, 0);
  TestValidator.equals(
    "entry from other org is not leaked",
    results.data.some((x) => x.id === createdEntrySecondOrg.id),
    false,
  );
}
