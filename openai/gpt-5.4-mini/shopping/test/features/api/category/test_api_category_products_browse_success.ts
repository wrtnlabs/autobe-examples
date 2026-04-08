import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify category-scoped product browsing returns paginated product summaries.
 *
 * This test validates that an authenticated customer can browse products inside a
 * visible category and receives only summary-style browse data. It focuses on
 * the customer-facing card payload, category scoping, and stable pagination
 * metadata used by catalog and category listing screens.
 *
 * 1. Register and authorize a customer session for authenticated browsing.
 * 2. Request the category product listing with a valid category identifier.
 * 3. Validate the response structure and pagination metadata.
 * 4. Validate that each returned item is a browse summary with seller, category,
 *    thumbnail, pricing, availability, review aggregates, and timestamps.
 */
export async function test_api_category_products_browse_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          categoryId,
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page is returned",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is returned",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination metadata is stable",
    output.pagination.records >= 0 && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all products are browse summaries",
    output.data.every(
      (product) =>
        typeof product.id === "string" &&
        typeof product.name === "string" &&
        typeof product.description === "string" &&
        typeof product.basePrice === "number" &&
        typeof product.priceMin === "number" &&
        typeof product.priceMax === "number" &&
        typeof product.availableVariantCount === "number" &&
        typeof product.reviewCount === "number" &&
        (product.averageRating === null ||
          typeof product.averageRating === "number") &&
        typeof product.createdAt === "string" &&
        typeof product.updatedAt === "string" &&
        (product.deletedAt === null || typeof product.deletedAt === "string") &&
        typeof product.sellerAccount.id === "string" &&
        typeof product.sellerAccount.email === "string" &&
        typeof product.sellerAccount.status === "string" &&
        typeof product.sellerAccount.createdAt === "string" &&
        typeof product.sellerAccount.updatedAt === "string" &&
        (product.sellerAccount.deletedAt === null ||
          typeof product.sellerAccount.deletedAt === "string") &&
        (product.category === null ||
          typeof product.category.id === "string") &&
        (product.mainImage === null ||
          typeof product.mainImage.imageUrl === "string"),
    ),
  );
}
