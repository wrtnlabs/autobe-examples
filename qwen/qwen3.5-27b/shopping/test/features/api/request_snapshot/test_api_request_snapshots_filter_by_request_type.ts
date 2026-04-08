import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator filtering of request snapshots by request type (cancellation or refund).
 *
 * Validates that administrators can filter request snapshots to view only cancellation requests or only refund requests for audit purposes. Ensures that the filtering mechanism correctly separates snapshots by their request_type discriminator and that pagination counts accurately reflect the filtered results.
 *
 * Special attention is given to verifying that no mixed request types appear in filtered results and that the pagination metadata correctly reports the count of filtered snapshots.
 *
 * 1. Authenticate as administrator using the join utility function.
 * 2. Create an administrator-specific connection with the authenticated token.
 * 3. Query request snapshots filtered by request_type='cancellation'.
 * 4. Validate all returned snapshots have request_type='cancellation'.
 * 5. Validate pagination records count matches the number of cancellation snapshots.
 * 6. Query request snapshots filtered by request_type='refund'.
 * 7. Validate all returned snapshots have request_type='refund'.
 * 8. Validate pagination records count matches the number of refund snapshots.
 */
export async function test_api_request_snapshots_filter_by_request_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Query request snapshots filtered by cancellation
  const cancellationResult =
    await api.functional.shoppingMall.administrator.request_snapshots.index(
      adminConnection,
      {
        body: {
          request_type: "cancellation",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(cancellationResult);
  // 3. Validate all cancellation snapshots have correct request_type
  for (const snapshot of cancellationResult.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} has request_type cancellation`,
      snapshot.request_type,
      "cancellation",
    );
  }
  // 4. Validate pagination records count for cancellation
  TestValidator.equals(
    "cancellation pagination records matches data length",
    cancellationResult.pagination.records,
    cancellationResult.data.length,
  );
  // 5. Query request snapshots filtered by refund
  const refundResult =
    await api.functional.shoppingMall.administrator.request_snapshots.index(
      adminConnection,
      {
        body: {
          request_type: "refund",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(refundResult);
  // 6. Validate all refund snapshots have correct request_type
  for (const snapshot of refundResult.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} has request_type refund`,
      snapshot.request_type,
      "refund",
    );
  }
  // 7. Validate pagination records count for refund
  TestValidator.equals(
    "refund pagination records matches data length",
    refundResult.pagination.records,
    refundResult.data.length,
  );
}
