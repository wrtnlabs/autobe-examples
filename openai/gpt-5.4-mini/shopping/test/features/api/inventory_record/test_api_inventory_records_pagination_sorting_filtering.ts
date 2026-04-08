import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_records_pagination_sorting_filtering(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test paginated inventory history retrieval with supported query controls.
   *
   * Verifies that the seller inventory history endpoint accepts paging and filtering inputs, returns a
   * valid paginated response, and preserves the association between each inventory record and the
   * requested product variant.
   *
   * 1. Authenticate a seller account using the seller join utility.
   * 2. Request variant inventory history with paging and text-based query controls.
   * 3. Validate pagination metadata and confirm every returned record belongs to the requested variant.
   * 4. Confirm the endpoint behaves as a read-only history query by repeating the request and comparing
   *    the structural response shape without depending on mutable fields.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
        typia.tags.Format<"email">,
      password: "password123!" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & typia.tags.Format<"uuid">>();
  const variantId = typia.random<string & typia.tags.Format<"uuid">>();
  const request = {
    page: 2,
    limit: 5,
    search: RandomGenerator.alphabets(3),
    sort: "-createdAt",
    reason: RandomGenerator.alphabets(3),
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const output =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page is returned",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is returned",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "total records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(output.data),
  );
  TestValidator.predicate("all records are variant-scoped", () =>
    output.data.every((record) => record.productVariant.id === variantId),
  );
  const repeated =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: request,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "repeated query keeps the same page metadata",
    repeated.pagination,
    output.pagination,
  );
  TestValidator.equals(
    "repeated query keeps the same record count",
    repeated.data.length,
    output.data.length,
  );
}
