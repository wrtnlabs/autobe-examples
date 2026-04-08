import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_status_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Validate customer was created successfully
  TestValidator.equals(
    "customer has valid email",
    typeof customer.email === "string",
    true,
  );
  TestValidator.equals(
    "customer has profile",
    typeof customer.profile === "object",
    true,
  );
  // 3. Test password reset status endpoint
  // Note: In a real scenario, a password reset token would be created first
  // Here we validate the endpoint is accessible with proper authentication
  // The resetId parameter would be a UUID of an existing password reset record
  const testResetId = typia.random<string & tags.Format<"uuid">>();
  const passwordResetStatus =
    await api.functional.ecommerceMall.customer.customer.password_resets.at(
      customerConnection,
      {
        resetId: testResetId,
      },
    );
  // 4. Validate response structure using typia.assert for complete type validation
  typia.assert(passwordResetStatus);
  // 5. Validate response fields based on IEcommerceMallCustomerPasswordReset
  TestValidator.equals(
    "has valid id",
    typeof passwordResetStatus.id === "string",
    true,
  );
  TestValidator.equals(
    "has customer summary",
    typeof passwordResetStatus.customer === "object",
    true,
  );
  TestValidator.equals(
    "has expiresAt as ISO date-time",
    typeof passwordResetStatus.expiresAt === "string",
    true,
  );
  // usedAt can be null (unused) or a timestamp (used)
  const usedAtIsValid =
    passwordResetStatus.usedAt === null ||
    typeof passwordResetStatus.usedAt === "string";
  TestValidator.equals("usedAt is null or ISO date-time", usedAtIsValid, true);
  // 6. If usedAt is not null, validate it's a valid ISO date-time format
  if (passwordResetStatus.usedAt !== null) {
    const usedAtDate = new Date(passwordResetStatus.usedAt);
    TestValidator.predicate(
      "usedAt is valid date",
      !isNaN(usedAtDate.getTime()),
    );
  }
}
