import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { generate_random_shopping_mall_seller_admin_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_admin_request_list_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register customer and submit admin request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const customerReason = `I want to become admin because ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const customerAdminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: { reason: customerReason },
      },
    );
  typia.assert(customerAdminRequest);
  // 3. Register seller and submit admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const sellerReason = `As a seller, I wish to become admin to ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const sellerAdminRequest =
    await generate_random_shopping_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: { reason: sellerReason },
      },
    );
  typia.assert(sellerAdminRequest);
  // 4. Super admin retrieves list of admin requests (no filters)
  const result =
    await api.functional.shoppingMall.superAdmin.adminRequests.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.predicate("current page >= 1", result.pagination.current >= 1);
  TestValidator.predicate("limit > 0", result.pagination.limit > 0);
  TestValidator.predicate("records >= 2", result.pagination.records >= 2);
  TestValidator.predicate("pages >= 1", result.pagination.pages >= 1);
  // 6. Validate data array contains at least 2 entries
  TestValidator.predicate(
    "data has at least 2 entries",
    result.data.length >= 2,
  );
  // 7. Validate that the customer's reason appears in the results
  const customerEntry = result.data.find(
    (entry) => entry.id === customerAdminRequest.id,
  );
  TestValidator.predicate(
    "customer admin request appears in list",
    customerEntry !== undefined,
  );
  if (customerEntry !== undefined) {
    TestValidator.equals(
      "customer reason matches",
      customerEntry.reason,
      customerReason,
    );
    TestValidator.equals(
      "customer status is pending",
      customerEntry.status,
      "pending",
    );
  }
  // 8. Validate that the seller's reason appears in the results
  const sellerEntry = result.data.find(
    (entry) => entry.id === sellerAdminRequest.id,
  );
  TestValidator.predicate(
    "seller admin request appears in list",
    sellerEntry !== undefined,
  );
  if (sellerEntry !== undefined) {
    TestValidator.equals(
      "seller reason matches",
      sellerEntry.reason,
      sellerReason,
    );
    TestValidator.equals(
      "seller status is pending",
      sellerEntry.status,
      "pending",
    );
  }
}
