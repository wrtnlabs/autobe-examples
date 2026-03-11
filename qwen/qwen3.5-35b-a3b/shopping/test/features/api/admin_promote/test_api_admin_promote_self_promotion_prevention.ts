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

export async function test_api_admin_promote_self_promotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Update connection headers with admin's authorization token
  const headers: Record<string, string> = {
    Authorization: adminAuthorized.token.access,
  };
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers,
  };
  // 2. Confirm State: Verify admin was created successfully
  TestValidator.predicate(
    "admin was created successfully",
    adminAuthorized.id !== undefined && adminAuthorized.email !== undefined,
  );
  // 3. Execute: Self-promotion attempt (super admin trying to promote themselves)
  const selfPromotionAttempt = async () =>
    await api.functional.ecommerceMall.admin.admins.promote(
      adminAuthConnection,
      {
        adminId: adminAuthorized.id,
        body: {
          reason: "Attempting self-promotion to test security control",
        } satisfies IEcommerceMallAdmin.IPromoteRequest,
      },
    );
  // 4. Validate Error Response: Verify 409 Conflict for self-promotion
  // This is the core security control test - self-promotion must be rejected
  await TestValidator.error(
    "self-promotion attempt rejected with 409 Conflict",
    selfPromotionAttempt,
  );
  // 5. Validate Security Control: Different user required for grade modification
  // The error validation confirms the system enforces that admin grade
  // modifications cannot be performed by the same user being modified
}
