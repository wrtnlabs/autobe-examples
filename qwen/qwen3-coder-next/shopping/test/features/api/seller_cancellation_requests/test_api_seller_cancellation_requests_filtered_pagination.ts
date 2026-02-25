import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerLoginResponse = await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerJoinResponse.data.profile.shop_name,
      password: sellerJoinResponse.data.profile.shop_name + "1234",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResponse);
  // 2. Get paginated cancellation requests with status filter
  const result =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection2,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.predicate(
    "pagination has current",
    result.pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  if (result.data.length > 0) {
    const firstRequest = result.data[0];
    typia.assert(firstRequest);
    // Validate cancellation request summary fields
    TestValidator.equals("has id", firstRequest.id !== null, true);
    TestValidator.equals(
      "has order_item",
      firstRequest.order_item !== null,
      true,
    );
    TestValidator.equals("has customer", firstRequest.customer !== null, true);
    TestValidator.equals("has status", firstRequest.status !== null, true);
    TestValidator.equals(
      "status is valid",
      ["pending", "approved", "rejected"].includes(firstRequest.status),
      true,
    );
    TestValidator.equals(
      "has created_at",
      firstRequest.created_at !== null,
      true,
    );
    TestValidator.equals(
      "created_at is ISO format",
      firstRequest.created_at.includes("T"),
      true,
    );
    // Validate nested order_item summary
    if (firstRequest.order_item) {
      TestValidator.equals(
        "order_item has id",
        firstRequest.order_item.id !== null,
        true,
      );
      TestValidator.equals(
        "order_item has quantity",
        firstRequest.order_item.quantity !== null,
        true,
      );
      TestValidator.equals(
        "order_item has item_status",
        firstRequest.order_item.item_status !== null,
        true,
      );
    }
    // Validate nested customer summary
    if (firstRequest.customer) {
      TestValidator.equals(
        "customer has id",
        firstRequest.customer.id !== null,
        true,
      );
      TestValidator.equals(
        "customer has email",
        firstRequest.customer.email !== null,
        true,
      );
    }
  }
}
