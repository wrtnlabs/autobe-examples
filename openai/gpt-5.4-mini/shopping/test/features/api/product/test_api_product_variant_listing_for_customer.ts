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

export async function test_api_product_variant_listing_for_customer(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer-visible product variant listing response shape and product scoping.
   *
   * This scenario verifies that an authenticated customer can request the variant list for a specific product and receive a paginated summary response containing only variants for that product. It focuses on the contract of the listing endpoint, including pagination metadata, product linkage, SKU and option presentation, pricing override behavior, active-state exposure, and timestamp fields.
   *
   * 1. Register and authorize a customer session using the customer join utility.
   * 2. Request the variant list for a valid product identifier with minimal paging controls.
   * 3. Validate the paginated response envelope and each returned variant summary.
   * 4. Ensure the response uses the requested product scope and summary-only shape.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "newest",
  } satisfies IMallPlatformProductVariant.IRequest;
  const output =
    await api.functional.mallPlatform.customer.products.variants.index(
      customerConnection,
      {
        productId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.predicate("pagination metadata exists", () => {
    return (
      output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0
    );
  });
  TestValidator.equals(
    "requested page is reflected",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "requested limit is reflected",
    output.pagination.limit,
    request.limit ?? output.pagination.limit,
  );
  for (const variant of output.data) {
    TestValidator.equals(
      "variant belongs to requested product",
      variant.product.id,
      productId,
    );
    TestValidator.predicate("variant has sku code", variant.skuCode.length > 0);
    TestValidator.predicate(
      "variant has option values",
      variant.optionValues.length > 0,
    );
    TestValidator.predicate(
      "variant has created timestamp",
      variant.createdAt.length > 0,
    );
    TestValidator.predicate(
      "variant has updated timestamp",
      variant.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "variant deleted marker is nullable",
      variant.deletedAt === null || variant.deletedAt.length > 0,
    );
    TestValidator.predicate(
      "variant exposes optional price override contract",
      variant.priceOverride === null || variant.priceOverride >= 0,
    );
    TestValidator.predicate(
      "variant exposes active state",
      typeof variant.isActive === "boolean",
    );
  }
}
