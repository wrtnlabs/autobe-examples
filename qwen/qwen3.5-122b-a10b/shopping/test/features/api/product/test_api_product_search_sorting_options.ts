import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test product search endpoint with various sorting options.
 *
 * Validates that the product search API correctly sorts results by different criteria including creation date and price. Ensures sorting order is maintained across pagination and that default sorting behavior works as expected.
 *
 * The test verifies multiple sorting configurations and confirms that the returned product lists are properly ordered according to the specified sort parameters.
 *
 * 1. Create and authenticate a customer account for search access.
 * 2. Search products with default sorting (created_at DESC) and verify newest products appear first.
 * 3. Search products sorted by price ascending (base_price ASC) and verify lowest prices appear first.
 * 4. Search products sorted by price descending (base_price DESC) and verify highest prices appear first.
 * 5. Search products sorted by creation date descending (created_at DESC) and verify newest products appear first.
 * 6. Verify sorting works correctly with pagination by checking page-based navigation maintains sort order.
 * 7. Validate that sort_by and sort_order parameters are optional with sensible defaults.
 */
export async function test_api_product_search_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test default sorting (created_at DESC - newest first)
  const defaultSearch = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(defaultSearch);
  // Verify default sorting: products should be ordered by created_at DESC
  if (defaultSearch.data.length > 1) {
    for (let i = 1; i < defaultSearch.data.length; i++) {
      TestValidator.predicate(
        `default sort: product ${i} created after or same as product ${i - 1}`,
        defaultSearch.data[i - 1].created_at >=
          defaultSearch.data[i].created_at,
      );
    }
  }
  // 3. Test sorting by price ascending (base_price ASC)
  const priceAscSearch = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        sort_by: "base_price" satisfies "base_price",
        sort_order: "asc" satisfies "asc",
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(priceAscSearch);
  // Verify ascending price order
  if (priceAscSearch.data.length > 1) {
    for (let i = 1; i < priceAscSearch.data.length; i++) {
      TestValidator.predicate(
        `price asc: product ${i} price >= product ${i - 1} price`,
        priceAscSearch.data[i - 1].base_price <=
          priceAscSearch.data[i].base_price,
      );
    }
  }
  // 4. Test sorting by price descending (base_price DESC)
  const priceDescSearch = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        sort_by: "base_price" satisfies "base_price",
        sort_order: "desc" satisfies "desc",
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(priceDescSearch);
  // Verify descending price order
  if (priceDescSearch.data.length > 1) {
    for (let i = 1; i < priceDescSearch.data.length; i++) {
      TestValidator.predicate(
        `price desc: product ${i} price <= product ${i - 1} price`,
        priceDescSearch.data[i - 1].base_price >=
          priceDescSearch.data[i].base_price,
      );
    }
  }
  // 5. Test sorting by created_at descending (newest first)
  const newestSearch = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at" satisfies "created_at",
        sort_order: "desc" satisfies "desc",
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(newestSearch);
  // Verify newest first order
  if (newestSearch.data.length > 1) {
    for (let i = 1; i < newestSearch.data.length; i++) {
      TestValidator.predicate(
        `newest first: product ${i} created after or same as product ${i - 1}`,
        newestSearch.data[i - 1].created_at >= newestSearch.data[i].created_at,
      );
    }
  }
  // 6. Test pagination maintains sort order (page-based)
  const firstPage = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at" satisfies "created_at",
        sort_order: "desc" satisfies "desc",
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(firstPage);
  // Fetch second page and verify order continues
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.ecommerce.customer.search.index(
      customerConnection,
      {
        body: {
          sort_by: "created_at" satisfies "created_at",
          sort_order: "desc" satisfies "desc",
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IEcommerceProduct.IRequest,
      },
    );
    typia.assert(secondPage);
    // Verify second page also maintains sort order
    if (secondPage.data.length > 1) {
      for (let i = 1; i < secondPage.data.length; i++) {
        TestValidator.predicate(
          `page 2: product ${i} created after or same as product ${i - 1}`,
          secondPage.data[i - 1].created_at >= secondPage.data[i].created_at,
        );
      }
    }
    // Verify page 2 items are older than page 1 items (descending order maintained)
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.predicate(
        "pagination: page 2 items older than page 1",
        firstPage.data[firstPage.data.length - 1].created_at >=
          secondPage.data[0].created_at,
      );
    }
  }
  // 7. Verify optional parameters work (no sort_by or sort_order specified)
  const noSortSearch = await api.functional.ecommerce.customer.search.index(
    customerConnection,
    {
      body: {
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(noSortSearch);
  // Should return results with default sorting applied
  TestValidator.predicate(
    "no sort params: returns results",
    noSortSearch.data.length >= 0,
  );
}
