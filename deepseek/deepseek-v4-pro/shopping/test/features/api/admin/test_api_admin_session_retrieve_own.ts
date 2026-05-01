import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator session retrieval after registration.
 *
 * Validates that an administrator can retrieve their own session record created during the join process. The join endpoint creates both the administrator account and an initial authenticated session. The administrator then retrieves the session record using their admin ID and the session ID extracted from the JWT access token's jti claim.
 *
 * The response must include all session fields: the session UUID, the owning administrator summary (without password), the originating IP address, page URL (href), referring URL (referrer), creation timestamp, and expiration timestamp. All timestamps must be valid ISO 8601 date-time values, and expired_at must be chronologically later than created_at.
 *
 * 1. Administrator registers via authorize_admin_join with known session context values for href, referrer, and ip.
 * 2. Decode the JWT access token payload to extract the session ID from the jti claim.
 * 3. Retrieve the session record via the sessions.at endpoint using the admin ID and extracted session ID.
 * 4. Validate session structure matches join input and response, and timestamp ordering is correct.
 */
export async function test_api_admin_session_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: { href, referrer, ip },
  });
  typia.assert(admin);
  const jwtPayload = JSON.parse(
    Buffer.from(
      admin.token.access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString(),
  );
  const sessionId = typia.assert<string & tags.Format<"uuid">>(jwtPayload.jti);
  const session = await api.functional.shoppingMall.admin.admins.sessions.at(
    adminConnection,
    {
      adminId: admin.id,
      sessionId,
    },
  );
  typia.assert(session);
  TestValidator.equals("admin id matches", session.admin.id, admin.id);
  TestValidator.equals("admin email matches", session.admin.email, admin.email);
  TestValidator.equals("admin grade matches", session.admin.grade, admin.grade);
  TestValidator.equals("session ip matches", session.ip, ip);
  TestValidator.equals("session href matches", session.href, href);
  TestValidator.equals("session referrer matches", session.referrer, referrer);
  TestValidator.predicate(
    "expired_at after created_at",
    new Date(session.expired_at).getTime() >
      new Date(session.created_at).getTime(),
  );
  TestValidator.equals(
    "admin deleted_at is null for new admin",
    session.admin.deleted_at,
    null,
  );
}
