import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import type { IErpHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_session_context_update_active_timer_session_scope_only(
  connection: api.IConnection,
): Promise<void> {
  // Actor-scoped connection (base connection must never be used directly)
  const guestConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const authorized = await authorize_guest_join(guestConnection, {
    body: { email, password } satisfies IErpHrmTimeTrackingGuest.IJoin,
  });
  typia.assert(authorized);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.erpHrmTimeTracking.guest.sessions.updateSessionContext(
    guestConnection,
    {
      body: {
        organization_id: organizationId,
      } satisfies IErpHrmTimeTrackingMemberSession.IUpdate,
    },
  );
}
