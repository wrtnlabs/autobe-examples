import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspension_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account creation
  const adminAuth = await authorize_administrator_join(connection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 3. Generate random UUID to simulate existing suspension record
  const suspensionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve seller suspension record
  const suspension =
    await api.functional.ecommerceMall.administrator.seller_suspensions.at(
      adminConnection,
      {
        suspensionId,
      },
    );
  typia.assert(suspension);
  // 5. Validate response structure
  TestValidator.equals("suspension id", suspension.id, suspensionId);
  // 6. Validate seller summary reference
  TestValidator.notEquals("seller id valid", suspension.seller.id, undefined);
  TestValidator.notEquals(
    "seller display name valid",
    suspension.seller.display_name,
    undefined,
  );
  TestValidator.notEquals(
    "seller approval status valid",
    suspension.seller.approval_status,
    undefined,
  );
  TestValidator.equals(
    "seller is suspended",
    suspension.seller.is_suspended,
    true,
  );
  TestValidator.notEquals(
    "seller created at valid",
    suspension.seller.created_at,
    undefined,
  );
  // 7. Validate suspended by admin reference
  TestValidator.notEquals(
    "admin id valid",
    suspension.suspendedByAdmin.id,
    undefined,
  );
  TestValidator.notEquals(
    "admin email valid",
    suspension.suspendedByAdmin.email,
    undefined,
  );
  TestValidator.notEquals(
    "admin display name valid",
    suspension.suspendedByAdmin.displayName,
    undefined,
  );
  TestValidator.equals(
    "admin is banned",
    suspension.suspendedByAdmin.isBanned,
    false,
  );
  TestValidator.notEquals(
    "admin created at valid",
    suspension.suspendedByAdmin.createdAt,
    undefined,
  );
  TestValidator.notEquals(
    "admin updated at valid",
    suspension.suspendedByAdmin.updatedAt,
    undefined,
  );
  // 8. Validate suspension timestamps
  TestValidator.notEquals(
    "suspended at valid",
    suspension.suspended_at,
    undefined,
  );
  TestValidator.equals("resolved at can be null", suspension.resolved_at, null);
  TestValidator.equals("reason is string", suspension.reason.length > 0, true);
  // 9. Validate audit timestamps
  TestValidator.notEquals("created at valid", suspension.created_at, undefined);
  TestValidator.notEquals("updated at valid", suspension.updated_at, undefined);
  TestValidator.equals("deleted at is null", suspension.deleted_at, null);
}
