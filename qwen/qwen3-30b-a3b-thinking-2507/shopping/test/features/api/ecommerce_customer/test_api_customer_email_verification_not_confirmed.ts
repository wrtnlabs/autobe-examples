import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verification_not_confirmed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new customer account to generate email verification
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com",
        referrer: "https://example.com",
      },
    });
  typia.assert(customer);
  // Ensure emailVerifications exist in customer response
  if (
    !customer.emailVerifications ||
    customer.emailVerifications.length === 0
  ) {
    throw new Error(
      "No email verification record found for the newly created customer",
    );
  }
  // 2. Get the verification ID from customer's emailVerifications
  const verificationId = customer.emailVerifications[0].id;
  // 3. Fetch the email verification record
  const verification =
    await api.functional.ecommerce.customer.email_verifications.at(
      customerConnection,
      { verificationId },
    );
  typia.assert(verification);
  // 4. Verify unconfirmed status
  TestValidator.equals(
    "confirmed_at should be null",
    verification.confirmed_at,
    null,
  );
  // 5. Verify 30-minute expiration window
  const createdTime = new Date(verification.created_at);
  const expirationTime = new Date(verification.expires_at);
  const timeDifference = expirationTime.getTime() - createdTime.getTime();
  const timeDifferenceMinutes = timeDifference / (1000 * 60);
  TestValidator.predicate(
    "expires_at should be 30 minutes after created_at",
    Math.abs(timeDifferenceMinutes - 30) < 1,
  );
  // 6. Verify token hash exists
  TestValidator.predicate(
    "token should be non-empty",
    verification.token.length > 0,
  );
  // 7. Verify customer ID matches
  TestValidator.equals(
    "customer_id should match",
    verification.customer_id,
    customer.id,
  );
}
