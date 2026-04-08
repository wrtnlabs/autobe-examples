import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies customer access control for product variant listing on inaccessible products.
 *
 * This test focuses on the protected variant-listing endpoint and confirms that a customer session cannot read variant data for a product the customer is not allowed to access.
 *
 * The scenario also reflects the catalog edge case where unavailable products must not leak variant information. Because the available API surface in this test context does not include product creation or catalog setup endpoints, the implementation validates the forbidden/not-found branch only and ensures the response never succeeds with variant data.
 *
 * 1. Register a customer and obtain an authenticated customer connection.
 * 2. Request variants for a random UUID product identifier that is not accessible to that customer.
 * 3. Verify the endpoint rejects the request with a forbidden or not-found error.
 */
export async function test_api_product_variant_listing_for_unavailable_or_forbidden_product(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#a",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "forbidden or inaccessible product should not expose variants",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.customer.products.variants.index(
        customerConnection,
        {
          productId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductVariant.IRequest,
        },
      );
    },
  );
}
