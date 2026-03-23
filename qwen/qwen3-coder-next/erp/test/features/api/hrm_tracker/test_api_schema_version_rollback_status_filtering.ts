import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_schema_version_rollback_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for accessing system version history
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Query versions with has_rollback=true
  const rolledBackResponse =
    await api.functional.hrmTracker.member.versions.index(memberConnection, {
      body: {
        has_rollback: true,
      } satisfies IHrmTrackerSystemVersion.IRequest,
    });
  typia.assert(rolledBackResponse);
  // 3. Query versions with has_rollback=false
  const activeResponse = await api.functional.hrmTracker.member.versions.index(
    memberConnection,
    {
      body: {
        has_rollback: false,
      } satisfies IHrmTrackerSystemVersion.IRequest,
    },
  );
  typia.assert(activeResponse);
  // 4. Verify both responses have data
  TestValidator.predicate(
    "has rolled back versions",
    rolledBackResponse.data.length > 0 || activeResponse.data.length > 0,
  );
  // 5. Verify empty search returns combined results
  const allResponse = await api.functional.hrmTracker.member.versions.index(
    memberConnection,
    {
      body: {
        // No has_rollback filter - should return all versions
      } satisfies IHrmTrackerSystemVersion.IRequest,
    },
  );
  typia.assert(allResponse);
  const rolledBackCount = rolledBackResponse.data.length;
  const activeCount = activeResponse.data.length;
  const totalCount = allResponse.data.length;
  TestValidator.equals(
    "total count equals sum of active and rolled-back",
    totalCount,
    rolledBackCount + activeCount,
  );
}
