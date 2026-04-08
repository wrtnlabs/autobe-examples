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
import { generate_random_ecommerce_mall_administrator_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_administrator_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Generate seller ID for suspension (assuming test environment has pre-created seller)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create seller suspension with meaningful reason
  const suspension =
    await api.functional.ecommerceMall.administrator.seller_suspensions.create(
      adminConnection,
      {
        body: {
          seller_id: sellerId,
          reason:
            "Policy violation: selling prohibited items. Multiple customer complaints received regarding counterfeit products.",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 4. Validate suspension record structure
  TestValidator.equals(
    "seller id matches input",
    suspension.seller.id,
    sellerId,
  );
  // 5. Validate seller is_suspended flag is set to true
  TestValidator.equals(
    "seller is_suspended flag is true",
    suspension.seller.is_suspended,
    true,
  );
  // 6. Validate suspendedByAdmin references correct admin
  TestValidator.equals(
    "suspendedByAdmin id matches admin id",
    suspension.suspendedByAdmin.id,
    admin.id,
  );
  TestValidator.equals(
    "suspendedByAdmin email matches admin email",
    suspension.suspendedByAdmin.email,
    admin.email,
  );
  // 7. Validate suspension state: currently suspended (not resolved)
  TestValidator.equals(
    "resolved_at is null for active suspension",
    suspension.resolved_at,
    null,
  );
  // 8. Validate suspension was created by admin
  TestValidator.equals(
    "reason is non-empty string",
    suspension.reason.length,
    102,
  );
  // 9. Validate timestamps are present
  TestValidator.equals(
    "suspended_at is present",
    suspension.suspended_at !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at is present",
    suspension.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at is present",
    suspension.updated_at !== undefined,
    true,
  );
  // 10. Validate record is not soft-deleted
  TestValidator.equals(
    "deleted_at is null (record active)",
    suspension.deleted_at,
    null,
  );
}
