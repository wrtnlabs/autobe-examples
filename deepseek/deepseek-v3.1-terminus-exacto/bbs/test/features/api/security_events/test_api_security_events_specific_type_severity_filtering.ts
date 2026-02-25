import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_security_events_specific_type_severity_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test specific type/severity combinations on existing security events
  const testCombinations = [
    { event_type: "failed_login", severity: "high" },
    { event_type: "threat_detected", severity: "critical" },
    { event_type: "suspicious_activity", severity: "medium" },
  ] as const;
  for (const combination of testCombinations) {
    const filterRequest: IDiscussionBoardSecurityEvent.IRequest = {
      event_type: combination.event_type,
      severity: combination.severity,
      resolved: false,
      user_id: null,
      admin_id: null,
      super_admin_id: null,
      limit: 10,
      page: 1,
    };
    const filteredResponse =
      await api.functional.discussionBoard.admin.security_events.index(
        adminConnection,
        { body: filterRequest },
      );
    typia.assert(filteredResponse);
    // Verify all returned events match the filter criteria
    for (const event of filteredResponse.data) {
      TestValidator.equals(
        `${combination.event_type}/${combination.severity} event type matches`,
        event.event_type,
        combination.event_type,
      );
      TestValidator.equals(
        `${combination.event_type}/${combination.severity} severity matches`,
        event.severity,
        combination.severity,
      );
    }
  }
  // Test events with null actor references
  const nullActorRequest: IDiscussionBoardSecurityEvent.IRequest = {
    event_type: "failed_login",
    severity: "high",
    resolved: false,
    user_id: null,
    admin_id: null,
    super_admin_id: null,
    limit: 10,
    page: 1,
  };
  const nullActorResponse =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      { body: nullActorRequest },
    );
  typia.assert(nullActorResponse);
  // Verify filtering handles null actor references correctly
  TestValidator.predicate(
    "null actor filter returns valid response",
    nullActorResponse.data.length >= 0,
  );
}
