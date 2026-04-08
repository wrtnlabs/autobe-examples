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

export async function test_api_product_variant_listing_with_search_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate customer-facing product variant browsing with pagination and sort controls.
   *
   * This test authenticates a customer, performs a variant listing request for a
   * product, and verifies the response is a coherent paginated collection of
   * variant summaries. It focuses on response structure, product scoping, and
   * pagination metadata because the available API surface does not provide a
   * product-seeding endpoint for deterministic search-result construction.
   *
   * 1. Register and authorize a customer through an isolated connection.
   * 2. Request a paginated variant list for a single product identifier.
   * 3. Validate page metadata and ensure every returned variant belongs to the product.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 2,
    sort: "+skuCode",
  } satisfies IMallPlatformProductVariant.IRequest;
  const output: IPageIMallPlatformProductVariant.ISummary =
    await api.functional.mallPlatform.customer.products.variants.index(
      customerConnection,
      {
        productId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata is coherent",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned page size does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "all returned variants belong to the requested product",
    output.data.every((variant) => variant.product.id === productId),
  );
  TestValidator.predicate(
    "variants are sorted by sku code ascending when multiple items exist",
    output.data.every(
      (variant, index, array) =>
        index === 0 || array[index - 1].skuCode <= variant.skuCode,
    ),
  );
  if (output.pagination.records > output.data.length) {
    const nextPage: IPageIMallPlatformProductVariant.ISummary =
      await api.functional.mallPlatform.customer.products.variants.index(
        customerConnection,
        {
          productId,
          body: {
            ...request,
            page: 2,
          } satisfies IMallPlatformProductVariant.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.predicate(
      "next page remains scoped to the same product",
      nextPage.data.every((variant) => variant.product.id === productId),
    );
  }
}
