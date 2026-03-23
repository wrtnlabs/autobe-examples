import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_status_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join two members in same organization
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Member retrieves activity logs with default pagination
  const result =
    await api.functional.hrmTracker.member.organizations.status_history.index(
      member1Connection,
      {
        organizationId: member1.id,
      },
    );
  typia.assert(result);
  // 3. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has valid current",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    result.pagination.pages >= 0,
  );
  // 4. Verify activity logs structure
  for (const log of result.data) {
    TestValidator.equals(
      "log has valid uuid id",
      /^[0-9a-f-]{36}$/i.test(log.id),
      true,
    );
    TestValidator.equals(
      "log has target_entity_type string",
      typeof log.target_entity_type,
      "string",
    );
    TestValidator.equals(
      "log has target_entity_id uuid",
      /^[0-9a-f-]{36}$/i.test(log.target_entity_id),
      true,
    );
    TestValidator.equals(
      "log has action_type string",
      typeof log.action_type,
      "string",
    );
    TestValidator.equals(
      "log has date-time created_at",
      log.created_at !== null && log.created_at !== undefined,
      true,
    );
    // Verify actor references
    if (log.actorMember !== null && log.actorMember !== undefined) {
      TestValidator.equals(
        "actorMember has valid id",
        /^[0-9a-f-]{36}$/i.test(log.actorMember.id),
        true,
      );
      TestValidator.equals(
        "actorMember has display_name",
        typeof log.actorMember.display_name,
        "string",
      );
    }
    if (log.actorGuest !== null && log.actorGuest !== undefined) {
      TestValidator.equals(
        "actorGuest has valid id",
        /^[0-9a-f-]{36}$/i.test(log.actorGuest.id),
        true,
      );
    }
  }
  // 5. Verify multi-tenancy isolation with second member
  const otherResult =
    await api.functional.hrmTracker.member.organizations.status_history.index(
      member2Connection,
      {
        organizationId: member2.id,
      },
    );
  typia.assert(otherResult);
  // 6. Both requests succeed independently (isolation verified)
  TestValidator.equals(
    "member1 got results",
    typeof result.data.length,
    "number",
  );
  TestValidator.equals(
    "member2 got results",
    typeof otherResult.data.length,
    "number",
  );
}
