import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

export async function test_api_customer_review_create_after_delivery(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/mallPlatform/signup",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const shipment =
    await api.functional.mallPlatform.customer.shipments.confirm_delivery.create(
      customerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(shipment);
  const review = await generate_random_mall_platform_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        productId: typia.random<string & tags.Format<"uuid">>(),
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMallPlatformReview.ICreate,
    },
  );
  typia.assert(review);
  TestValidator.equals(
    "review customer email",
    review.customer.email,
    joined.email,
  );
  TestValidator.equals("review rating", review.rating, 5);
  TestValidator.equals("review content", review.content, review.content);
  TestValidator.predicate("review id exists", review.id.length > 0);
  TestValidator.predicate(
    "review created timestamp exists",
    review.created_at.length > 0,
  );
  TestValidator.predicate(
    "review updated timestamp exists",
    review.updated_at.length > 0,
  );
}
