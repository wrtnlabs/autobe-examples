import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
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

export async function test_api_refund_request_seller_review_queue(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `seller_${typia.random<string & tags.Format<"email">>()}`;
  const customerEmail = `customer_${typia.random<string & tags.Format<"email">>()}`;
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password,
      href: "https://example.com/seller/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sellerScoped =
    await api.functional.mallPlatform.customer.refundRequests.index(
      sellerConnection,
      {
        body: {
          sellerId: typia.random<string & tags.Format<"uuid">>(),
          hasReviewedAt: false,
          page: 1,
          limit: 10,
          sort: "createdAt",
          order: "desc",
        } satisfies IMallPlatformRefundRequest.IRequest,
      },
    );
  typia.assert(sellerScoped);
  const reviewedOnly =
    await api.functional.mallPlatform.customer.refundRequests.index(
      sellerConnection,
      {
        body: {
          sellerId: typia.random<string & tags.Format<"uuid">>(),
          hasReviewedAt: true,
          page: 2,
          limit: 5,
          sort: "reviewedAt",
          order: "desc",
        } satisfies IMallPlatformRefundRequest.IRequest,
      },
    );
  typia.assert(reviewedOnly);
  TestValidator.equals(
    "pagination limit is preserved",
    sellerScoped.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page is 1",
    sellerScoped.pagination.current,
    1,
  );
  TestValidator.predicate(
    "seller refund request list has valid pagination metadata",
    sellerScoped.pagination.records >= 0 && sellerScoped.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "reviewed-only queue has valid pagination metadata",
    reviewedOnly.pagination.current === 2 &&
      reviewedOnly.pagination.limit === 5,
  );
  TestValidator.predicate(
    "refund request summaries are typed and returned as an array",
    Array.isArray(sellerScoped.data) && Array.isArray(reviewedOnly.data),
  );
  TestValidator.predicate(
    "refund request summaries expose current state fields",
    sellerScoped.data.every((request) => {
      return (
        typeof request.id === "string" &&
        typeof request.reason === "string" &&
        typeof request.status === "string" &&
        (request.reviewedAt === null ||
          typeof request.reviewedAt === "string") &&
        (request.reviewNote === null ||
          typeof request.reviewNote === "string") &&
        request.orderItem.quantity >= 0 &&
        typeof request.orderItem.status === "string" &&
        typeof request.orderItem.productVariant.skuCode === "string" &&
        typeof request.orderItem.seller.email === "string"
      );
    }),
  );
  TestValidator.predicate(
    "reviewed-only filter does not return unreviewed items",
    reviewedOnly.data.every((request) => request.reviewedAt !== null),
  );
}
