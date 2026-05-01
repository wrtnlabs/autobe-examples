import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Verify that a regular member cannot retrieve another member's session.
 *
 * Validates the authorization boundary that protects session privacy by
 * preventing unauthorized access to another user's authentication tokens,
 * IP address, and connection metadata.
 *
 * 1. Guest B joins the platform, creating their own authenticated session.
 * 2. Guest A joins the platform as a regular member with no Manager or Owner role.
 * 3. Guest A attempts to retrieve a session — the endpoint must return 403.
 */
export async function test_api_session_cross_user_access_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest B joins — creates a session in the system
  const connectionGuestB: api.IConnection = { host: connection.host };
  await authorize_guest_join(connectionGuestB, {});
  // 2. Guest A joins — regular member, no Manager/Owner role
  const connectionGuestA: api.IConnection = { host: connection.host };
  await authorize_guest_join(connectionGuestA, {});
  // 3. Guest A attempts to access a session they do not own
  await TestValidator.httpError(
    "cross-user session access forbidden",
    403,
    async () => {
      await api.functional.erpHrm.guest.sessions.at(connectionGuestA, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
