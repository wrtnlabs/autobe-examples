import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Use a fixed email for testing duplicate detection
  const existingEmail = "existing@example.com" satisfies string &
    typia.tags.Format<"email">;
  const firstPassword = "FirstPassword123!";
  const secondPassword = "DifferentPassword456!";
  // Step 1: Register first customer with the email
  const firstConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstConnection, {
    body: {
      email: existingEmail,
      password: firstPassword,
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  // Validate first registration succeeded
  TestValidator.equals(
    "first customer email matches",
    firstCustomer.email,
    existingEmail,
  );
  TestValidator.predicate(
    "first customer has valid id",
    firstCustomer.id.length > 0,
  );
  // Step 2: Attempt to register second customer with same email
  const secondConnection: api.IConnection = { host: connection.host };
  // Step 3: Validate error response for duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_customer_join(secondConnection, {
        body: {
          email: existingEmail,
          password: secondPassword,
          href: typia.random<string & typia.tags.Format<"uri">>(),
          referrer: typia.random<string & typia.tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.IJoin,
      });
    },
  );
  // Step 4: Verify original account still exists and works
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyCustomer = await authorize_customer_login(verifyConnection, {
    body: {
      email: existingEmail,
      password: firstPassword,
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(verifyCustomer);
  // Validate original account is intact
  TestValidator.equals(
    "original customer email preserved",
    verifyCustomer.email,
    existingEmail,
  );
  TestValidator.equals(
    "original customer id preserved",
    verifyCustomer.id,
    firstCustomer.id,
  );
}