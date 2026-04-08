import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_requests_filter_and_paginate_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate refund request collection browsing for a specific order item.
   *
   * This scenario exercises the seller-scoped refund request list endpoint with
   * filtering and pagination behavior against an existing order item context.
   * It checks that returned records are stable, pagination metadata is coherent,
   * and repeated calls with the same criteria remain deterministic.
   *
   * 1. Authenticate a seller using a dedicated actor connection.
   * 2. Query the refund request list for a concrete order item identifier.
   * 3. Verify the endpoint response is paginated and self-consistent.
   * 4. Confirm repeated calls produce the same page metadata and record order.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "1234" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const sellerAccess = sellerAuth.token.access;
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: sellerAccess,
  };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    page: 1,
    limit: 10,
    sort: "-createdAt",
  } satisfies IMallPlatformRefundRequest.IRequest;
  const first =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.index(
      sellerConnection,
      {
        orderItemId,
        body: requestBody,
      },
    );
  typia.assert(first);
  const repeat =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.index(
      sellerConnection,
      {
        orderItemId,
        body: requestBody,
      },
    );
  typia.assert(repeat);
  TestValidator.equals(
    "deterministic pagination metadata",
    repeat.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "deterministic response order",
    repeat.data.map((x) => x.id),
    first.data.map((x) => x.id),
  );
  TestValidator.predicate(
    "page size respected",
    first.data.length <= requestBody.limit,
  );
  TestValidator.equals(
    "page number preserved",
    first.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "limit preserved",
    first.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    first.pagination.pages >= 0,
  );
  if (first.pagination.pages > 1) {
    const secondPage =
      await api.functional.mallPlatform.seller.orderItems.refundRequests.index(
        sellerConnection,
        {
          orderItemId,
          body: {
            ...requestBody,
            page: 2,
          } satisfies IMallPlatformRefundRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number preserved",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit preserved",
      secondPage.pagination.limit,
      requestBody.limit,
    );
    TestValidator.predicate(
      "second page size respected",
      secondPage.data.length <= requestBody.limit,
    );
    TestValidator.notEquals(
      "page navigation returns different records when another page exists",
      first.data.map((x) => x.id),
      secondPage.data.map((x) => x.id),
    );
  }
}
