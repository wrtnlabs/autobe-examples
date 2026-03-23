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

export async function test_api_activity_log_search_by_target_entity_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection through join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create another member to act as project creator
  const projectCreatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(projectCreatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 3. Get a valid target entity ID by searching all activities
  const allActivities =
    await api.functional.hrmTracker.member.analytics.activities.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IHrmTrackerActivityLog.IRequest,
      },
    );
  typia.assert(allActivities);
  // Use first available target entity ID or generate one for testing
  const targetEntityId =
    allActivities.data.length > 0
      ? allActivities.data[0].target_entity_id
      : typia.random<string & tags.Format<"uuid">>();
  // 4. Search activity logs by target entity ID
  const searchResult =
    await api.functional.hrmTracker.member.analytics.activities.index(
      memberConnection,
      {
        body: {
          target_entity_id: targetEntityId,
          page: 1,
          limit: 100,
        } satisfies IHrmTrackerActivityLog.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Validate search results
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== null,
  );
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);
  TestValidator.predicate(
    "all logs match target entity ID",
    searchResult.data.every((log) => log.target_entity_id === targetEntityId),
  );
  TestValidator.equals(
    "pagination records matches data count",
    searchResult.pagination.records,
    searchResult.data.length,
  );
}
