import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceModificationInventoryRestoration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_restorations_filter_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Test 1: Search with empty restoration_reason (should return all records)
  const emptySearch =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          restoration_reason: undefined,
          page: 1,
          limit: 20,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Test 2: Search with non-matching term (should return empty results)
  const nonMatchingSearch =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          restoration_reason: "nonexistent_term_xyz123",
          page: 1,
          limit: 20,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "non-matching search returns empty",
    nonMatchingSearch.data.length,
    0,
  );
  // Test 3: Search with partial matching term "cancellation"
  const cancellationSearch =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          restoration_reason: "cancellation",
          page: 1,
          limit: 20,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(cancellationSearch);
  // Validate that returned records contain the search term
  if (cancellationSearch.data.length > 0) {
    for (const record of cancellationSearch.data) {
      TestValidator.predicate(
        "cancellation search term found in restoration_reason",
        record.restoration_reason.toLowerCase().includes("cancellation"),
      );
    }
  }
  // Test 4: Search with partial matching term "refund"
  const refundSearch =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          restoration_reason: "refund",
          page: 1,
          limit: 20,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(refundSearch);
  // Validate that returned records contain the search term
  if (refundSearch.data.length > 0) {
    for (const record of refundSearch.data) {
      TestValidator.predicate(
        "refund search term found in restoration_reason",
        record.restoration_reason.toLowerCase().includes("refund"),
      );
    }
  }
  // Test 5: Search with very short partial term to test trigram matching
  const shortSearch =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          restoration_reason: "can",
          page: 1,
          limit: 20,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(shortSearch);
  // Validate pagination structure for all searches
  const searches = [emptySearch, cancellationSearch, refundSearch, shortSearch];
  for (const search of searches) {
    TestValidator.predicate(
      "pagination has valid current page",
      search.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has valid limit",
      search.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has valid records count",
      search.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has valid pages count",
      search.pagination.pages >= 0,
    );
  }
  // Test edge case: empty string search term
  const emptyStringSearch =
    await api.functional.ecommerce.seller.modification_inventory_restorations.index(
      sellerConnection,
      {
        body: {
          restoration_reason: "",
          page: 1,
          limit: 20,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(emptyStringSearch);
  TestValidator.equals(
    "empty string search behaves like undefined",
    emptyStringSearch.data.length,
    emptySearch.data.length,
  );
}
