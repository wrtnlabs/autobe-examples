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

export async function test_api_session_context_update_success_and_unauthorized_org_rejected(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  // 1) Guest join
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = typia.random<string & tags.Format<"password">>();
  const authorized: IErpHrmTimeTrackingGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: guestEmail,
        password: guestPassword,
      } satisfies IErpHrmTimeTrackingGuest.IJoin,
    });
  typia.assert(authorized);
  // Use actor-specific connection with the issued access token header
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = authorized.token.access;
  // Pick two candidate organization ids.
  // We don't have an endpoint to enumerate selectable orgs, so we rely on
  // existing environment fixtures where one uuid is likely selectable.
  const selectableOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const unauthorizedOrganizationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Ensure different values to avoid degenerate cases.
  const targetUnauthorizedOrganizationId: string & tags.Format<"uuid"> =
    unauthorizedOrganizationId === selectableOrganizationId
      ? (typia.random<string & tags.Format<"uuid">>() satisfies string &
          tags.Format<"uuid">)
      : unauthorizedOrganizationId;
  const updateToSelectable = {
    organization_id: selectableOrganizationId,
  } satisfies IErpHrmTimeTrackingMemberSession.IUpdate;
  const updateToUnauthorized = {
    organization_id: targetUnauthorizedOrganizationId,
  } satisfies IErpHrmTimeTrackingMemberSession.IUpdate;
  // Scenario 1: switching organization context should succeed.
  await api.functional.erpHrmTimeTracking.guest.sessions.updateSessionContext(
    authConnection,
    {
      body: updateToSelectable,
    },
  );
  // Scenario 2: switching to an unauthorized organization should be rejected.
  await TestValidator.error(
    "guest session context update should reject unauthorized organization selection",
    async () => {
      await api.functional.erpHrmTimeTracking.guest.sessions.updateSessionContext(
        authConnection,
        {
          body: updateToUnauthorized,
        },
      );
    },
  );
  // Session context should remain usable for the previously selectable org.
  await api.functional.erpHrmTimeTracking.guest.sessions.updateSessionContext(
    authConnection,
    {
      body: updateToSelectable,
    },
  );
}
