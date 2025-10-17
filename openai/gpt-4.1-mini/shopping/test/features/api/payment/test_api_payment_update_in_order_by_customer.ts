import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the updating of payment information in an order by a customer.
 *
 * This test performs a complete end-to-end scenario:
 *
 * 1. Customer user account registration via customer auth join API.
 * 2. Admin account registration via admin auth join API.
 * 3. Seller entity creation via admin API.
 * 4. Customer entity creation via shopping mall customer API.
 * 5. Order creation linked with the created seller and customer.
 * 6. Creation of a payment record for the order.
 * 7. Update to the payment record with new payment data.
 * 8. Verification of the payment update response to ensure data correctness.
 *
 * The flow includes switching authentication contexts appropriately between
 * customer, admin (seller), and ensures all required properties are correctly
 * provided with realistic random values conforming to described formats.
 *
 * Only the happy path is tested; no negative or error case handling is covered.
 *
 * Each step validates the proper type compatibility via typia.assert and
 * business correctness by TestValidator assertions with meaningful titles.
 */
