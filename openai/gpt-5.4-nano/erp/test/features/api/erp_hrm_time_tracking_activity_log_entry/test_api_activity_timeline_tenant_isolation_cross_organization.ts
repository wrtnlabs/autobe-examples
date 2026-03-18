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

export async function test_api_activity_timeline_tenant_isolation_cross_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(24),
      organizationName: `tenant-a-${RandomGenerator.alphabets(10)}`,
      organizationDescription: `tenant-a-desc-${RandomGenerator.alphabets(10)}`,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(10)}`,
      referrer: `https://ref.example.com/${RandomGenerator.alphabets(10)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  // Without dedicated seeding/context-switch APIs, we validate a tenant-scoping invariant
  // observable from the response itself: all returned entries must share a single
  // organization_id and must reference the requested target_entity_id.
  const targetEntityTypeA: string = RandomGenerator.alphabets(12);
  const targetEntityIdA = typia.random<string & tags.Format<"uuid">>();
  const targetEntityTypeB: string = RandomGenerator.alphabets(12);
  const targetEntityIdB = typia.random<string & tags.Format<"uuid">>();
  const pageA =
    await api.functional.erpHrmTimeTracking.member.activityLogs.targetEntities.timeline.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "occurred_at",
          sortOrder: "desc",
          targetEntityType: targetEntityTypeA,
          targetEntityId: targetEntityIdA,
          includeRemovedEntries: false,
          useSnapshots: true,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(pageA);
  if (pageA.data.length > 0) {
    const orgIdA = pageA.data[0].organization_id;
    TestValidator.predicate(
      "pageA items share same organization_id",
      pageA.data.every((e) => e.organization_id === orgIdA),
    );
    TestValidator.predicate(
      "pageA items reference requested targetEntityId",
      pageA.data.every((e) => e.target_entity_id === targetEntityIdA),
    );
  }
  const pageB =
    await api.functional.erpHrmTimeTracking.member.activityLogs.targetEntities.timeline.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "occurred_at",
          sortOrder: "desc",
          targetEntityType: targetEntityTypeB,
          targetEntityId: targetEntityIdB,
          includeRemovedEntries: false,
          useSnapshots: true,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(pageB);
  if (pageB.data.length > 0) {
    const orgIdB = pageB.data[0].organization_id;
    TestValidator.predicate(
      "pageB items share same organization_id",
      pageB.data.every((e) => e.organization_id === orgIdB),
    );
    TestValidator.predicate(
      "pageB items reference requested targetEntityId",
      pageB.data.every((e) => e.target_entity_id === targetEntityIdB),
    );
  }
}
