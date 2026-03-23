import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_rejection_missing_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account first
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Create admin account for rejection workflow
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Login as admin
  await api.functional.ecommerceMall.auth.admin.login(adminConnection, {
    body: {
      email:
        typeof adminConnection.headers?.Authorization === "string"
          ? adminConnection.headers.Authorization.replace("Bearer ", "")
          : typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 4. Create seller registration request
  const registration =
    await api.functional.ecommerceMall.admin.seller_registrations.reject(
      adminConnection,
      {
        sellerRegistrationCode: seller.id,
        body: {
          approval_status: "pending",
          shop_name: seller.shop_name,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(registration);
  TestValidator.equals(
    "initial status is pending",
    registration.approval_status,
    "pending",
  );
  // 5. Attempt to reject registration without providing rejection_reason
  // This should fail with validation error
  const rejectBody: IEcommerceMallSellerRegistration.IUpdate = {
    approval_status: "rejected",
    // rejection_reason is intentionally omitted to test validation
  };
  try {
    await api.functional.ecommerceMall.admin.seller_registrations.reject(
      adminConnection,
      {
        sellerRegistrationCode: seller.id,
        body: rejectBody,
      },
    );
    throw new Error("Expected validation error but rejection succeeded");
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      typeof (error as any).status === "number"
    ) {
      TestValidator.equals(
        "status is 400 Bad Request",
        (error as any).status,
        400,
      );
    } else {
      throw error;
    }
  }
  // 6. Verify registration still in pending state
  const updatedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.reject(
      adminConnection,
      {
        sellerRegistrationCode: seller.id,
        body: {},
      },
    );
  typia.assert(updatedRegistration);
  TestValidator.equals(
    "status remains pending",
    updatedRegistration.approval_status,
    "pending",
  );
  TestValidator.equals(
    "no rejection reason set",
    updatedRegistration.rejection_reason,
    undefined,
  );
  TestValidator.equals(
    "no rejection timestamp set",
    updatedRegistration.responded_at,
    undefined,
  );
}