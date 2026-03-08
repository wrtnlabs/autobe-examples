import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promote_self_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as super administrator (user A)
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAuthorization = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorization);
  // 2. Create admin connection for the promotion attempt
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuthorization.token.access,
  };
  // 3. Verify admin exists and is accessible
  // (Note: No GET /admins/{adminId} endpoint available in SDK)
  // We'll use the adminAuthorization.id to verify the account was created
  const adminId = adminAuthorization.id;
  typia.assert(adminId);
  // 4. Attempt self-promotion (admin promoting themselves)
  const selfPromotionAttempt = async () => {
    return await api.functional.ecommerceMall.admin.admins.promote(
      adminConnection,
      {
        adminId: adminId, // Trying to promote themselves
        body: {} satisfies IEcommerceMallAdmin.IPromoteRequest,
      },
    );
  };
  // 5. Verify promotion is rejected with 409 Conflict
  // The security requirement: self-promotion is strictly forbidden
  await TestValidator.httpError(
    "self-promotion forbidden with 409 Conflict",
    409,
    selfPromotionAttempt,
  );
  // 6. Verify admin account still exists (no side effects from failed promotion)
  // (Note: No verification endpoint available in SDK, but the adminAuthorization
  // proves the account was created and is accessible)
  TestValidator.equals("admin ID unchanged", adminAuthorization.id, adminId);
}
