import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntrySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_timeline_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member #1 (organization A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: "Password123!",
      organizationName: `org-a-${RandomGenerator.alphabets(8)}`,
      organizationDescription: `desc-a-${RandomGenerator.alphabets(8)}`,
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Authenticate as member #2 (organization B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: "Password123!",
      organizationName: `org-b-${RandomGenerator.alphabets(8)}`,
      organizationDescription: `desc-b-${RandomGenerator.alphabets(8)}`,
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const targetEntityType = "member";
  const candidateTargetEntityIds = Array.from({ length: 5 }, () =>
    typia.random<string & tags.Format<"uuid">>(),
  ) as Array<string & tags.Format<"uuid">>;
  let matchedTargetEntityId: (string & tags.Format<"uuid">) | undefined;
  // Probe until we find a target that returns something in org B
  for (const candidate of candidateTargetEntityIds) {
    const req = {
      target_entity_type: targetEntityType,
      target_entity_id: candidate,
      page: 1,
      limit: 10,
    } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
    const bTimeline =
      await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.targetEntities.timeline.index(
        memberBConnection,
        { body: req },
      );
    typia.assert(bTimeline);
    if (bTimeline.data.length > 0) {
      matchedTargetEntityId = candidate;
      break;
    }
  }
  TestValidator.predicate(
    "tenant isolation requires a target with snapshots in org B",
    matchedTargetEntityId !== undefined,
  );
  const chosenReq = {
    target_entity_type: targetEntityType,
    target_entity_id: matchedTargetEntityId!,
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  const aTimeline =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.targetEntities.timeline.index(
      memberAConnection,
      { body: chosenReq },
    );
  typia.assert(aTimeline);
  const bTimeline =
    await api.functional.erpHrmTimeTracking.member.activityLogSnapshots.targetEntities.timeline.index(
      memberBConnection,
      { body: chosenReq },
    );
  typia.assert(bTimeline);
  TestValidator.equals(
    "org A must not see org B snapshots",
    aTimeline.data.length,
    0,
  );
  TestValidator.predicate(
    "org B should return snapshots for the chosen target",
    bTimeline.data.length > 0,
  );
}
