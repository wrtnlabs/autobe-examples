import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_registration_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create pending seller registration (simulated existing data)
  const sellerRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        sellerRegistrationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          shop_name: RandomGenerator.name(),
          shop_description: RandomGenerator.paragraph({ sentences: 3 }),
          approval_status: "pending",
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(sellerRegistration);
  // 3. Reject seller registration with reason
  const rejectionReason = "Invalid business documents";
  const updatedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        sellerRegistrationId: sellerRegistration.id,
        body: {
          approval_status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(updatedRegistration);
  // 4. Validate rejection response
  TestValidator.equals(
    "approval_status is rejected",
    updatedRegistration.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason matches",
    updatedRegistration.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate("responded_at is set", () => {
    return (
      updatedRegistration.responded_at !== null &&
      updatedRegistration.responded_at !== undefined
    );
  });
}
