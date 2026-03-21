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

export async function test_api_guest_session_list_as_authenticated_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Retrieve paginated guest sessions list
  const response = await api.functional.erpHrm.admin.guest_sessions.index(
    adminConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmGuestSession.IRequest,
    },
  );
  // 3. Validate response structure with typia.assert
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals(
    "current page is valid",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals("limit is valid", response.pagination.limit >= 0, true);
  TestValidator.equals(
    "records is valid",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals("pages is valid", response.pagination.pages >= 0, true);
  // 5. Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 6. Validate guest session summary fields (if any sessions exist)
  for (const session of response.data) {
    TestValidator.equals("session has id", session.id !== undefined, true);
    TestValidator.equals("session has ip", session.ip !== undefined, true);
    TestValidator.equals("session has href", session.href !== undefined, true);
    TestValidator.equals(
      "session has referrer",
      session.referrer !== undefined,
      true,
    );
    TestValidator.equals(
      "session has created_at",
      session.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has expired_at",
      session.expired_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has guest info",
      session.guest !== undefined,
      true,
    );
    // Validate guest info
    if (session.guest) {
      TestValidator.equals(
        "guest has id",
        session.guest.id !== undefined,
        true,
      );
      TestValidator.equals(
        "guest has device_identifier",
        session.guest.device_identifier !== undefined,
        true,
      );
      TestValidator.equals(
        "guest has created_at",
        session.guest.created_at !== undefined,
        true,
      );
    }
  }
}
