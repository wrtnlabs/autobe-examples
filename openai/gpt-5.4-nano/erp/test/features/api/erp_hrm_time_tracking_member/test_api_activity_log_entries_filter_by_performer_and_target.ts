import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
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

export async function test_api_activity_log_entries_filter_by_performer_and_target(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join (authorizes as member and initializes organization context)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia
    .random<string & tags.Format<"email">>()
    .toLowerCase();
  const memberPassword = `Pass_${RandomGenerator.alphabets(10)}_!1`;
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      organizationName: `Org_${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(6)}`,
      ip,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // 2) performed-by filter with a bounded occurred_at window
  const now = new Date();
  const occurredAtTo = now.toISOString();
  const occurredAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const limit = 2;
  const firstPage =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit,
          performedByMemberId: authorized.id,
          occurredAtFrom,
          occurredAtTo,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(firstPage);
  const records = firstPage.pagination.records;
  const pages = records === 0 ? 0 : firstPage.pagination.pages;
  const collected: IErpHrmTimeTrackingActivityLogEntry.ISummary[] = [
    ...firstPage.data,
  ];
  for (let currentPage = 2; currentPage <= pages; currentPage++) {
    const p =
      await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
        memberConnection,
        {
          body: {
            page: currentPage,
            limit,
            performedByMemberId: authorized.id,
            occurredAtFrom,
            occurredAtTo,
          } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
        },
      );
    typia.assert(p);
    TestValidator.equals(
      "pagination.records should remain stable across pages",
      p.pagination.records,
      records,
    );
    collected.push(...p.data);
  }
  TestValidator.equals(
    "collected entries count should equal pagination.records",
    collected.length,
    records,
  );
  TestValidator.predicate(
    "all returned entries should match performed_by_member_id",
    () =>
      collected.every(
        (entry) => entry.performed_by_member_id === authorized.id,
      ),
  );
  if (collected.length > 0) {
    const orgId = collected[0].organization_id;
    TestValidator.predicate(
      "all returned entries should be scoped to a single organization",
      () => collected.every((entry) => entry.organization_id === orgId),
    );
  }
  // 3) polymorphic target filtering
  // Without fixture access to a known target entity, validate consistency
  // of returned entries when any exist.
  const targetEntityType = "test_target";
  const targetEntityId = typia.random<string & tags.Format<"uuid">>();
  const targetPage =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          targetEntityType,
          targetEntityId,
          occurredAtFrom,
          occurredAtTo,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(targetPage);
  if (targetPage.data.length > 0) {
    TestValidator.predicate(
      "all returned entries should match targetEntityType+targetEntityId",
      () =>
        targetPage.data.every(
          (entry) =>
            entry.target_entity_type === targetEntityType &&
            entry.target_entity_id === targetEntityId,
        ),
    );
    const orgId = targetPage.data[0].organization_id;
    TestValidator.predicate(
      "all returned target entries should be scoped to a single organization",
      () => targetPage.data.every((entry) => entry.organization_id === orgId),
    );
  }
  const anotherTargetEntityId = typia.random<string & tags.Format<"uuid">>();
  const anotherTargetPage =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          targetEntityType,
          targetEntityId: anotherTargetEntityId,
          occurredAtFrom,
          occurredAtTo,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(anotherTargetPage);
  if (anotherTargetPage.data.length > 0) {
    TestValidator.predicate(
      "all returned entries for switched targetEntityId should match the new targetEntityId",
      () =>
        anotherTargetPage.data.every(
          (entry) => entry.target_entity_id === anotherTargetEntityId,
        ),
    );
  }
}
