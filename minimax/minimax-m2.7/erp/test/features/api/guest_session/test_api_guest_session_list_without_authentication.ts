import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that unauthenticated requests to guest sessions endpoint are denied.
 *
 * This test validates the security requirement that guest session audit data
 * is protected and only accessible to authenticated administrators.
 * Without providing any authentication credentials, the system must return
 * an unauthorized error response.
 */
export async function test_api_guest_session_list_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to access guest sessions endpoint WITHOUT authentication
  // This should fail with an unauthorized error (401)
  await TestValidator.httpError(
    "unauthenticated request should be denied",
    401,
    async () =>
      await api.functional.erpHrm.admin.guest_sessions.index(connection, {
        body: typia.random<IErpHrmGuestSession.IRequest>(),
      }),
  );
}
