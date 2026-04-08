import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_cancellation_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  const adminEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const sellerEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const customerEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const password = "password123!";
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: adminEmail,
        password,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.predicate(
    "seller product should be created with a stable identifier",
    product.id.length > 0,
  );
  const cancellationRequest =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
      customerConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  const approved =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.approve.create(
      administratorConnection,
      {
        orderItemId: cancellationRequest.orderItem.id,
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(approved);
  TestValidator.equals(
    "cancellation request id",
    approved.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request status",
    approved.status,
    "approved",
  );
  TestValidator.equals(
    "cancellation request reason",
    approved.reason,
    cancellationRequest.reason,
  );
  TestValidator.predicate(
    "reviewed at should be recorded",
    approved.reviewedAt !== null,
  );
  TestValidator.predicate(
    "review result should be recorded",
    approved.reviewResult !== null,
  );
  TestValidator.predicate(
    "reviewer note should be recorded",
    approved.reviewerNote !== null,
  );
  TestValidator.predicate(
    "reviewer should be recorded",
    approved.reviewer !== null,
  );
  TestValidator.equals(
    "order item should remain the same",
    approved.orderItem.id,
    cancellationRequest.orderItem.id,
  );
}
