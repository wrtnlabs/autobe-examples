import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and approve a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Setup: Create mock product data (product creation API not available in SDK)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product: IEcommerceMallProduct.ISummary = {
    id: productId,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    category: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(2),
      description: null,
      sort_order: null,
      parent: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies IEcommerceMallCategory.ISummary,
    seller: {
      id: seller.id,
      display_name: seller.display_name,
      approval_status: "approved",
      is_suspended: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies IEcommerceMallSeller.ISummary,
    availability_status: "available",
    has_available_variants: true,
  };
  typia.assert(product);
  // 3. Setup: Create mock variant data (variant creation API not available in SDK)
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const variant: IEcommerceMallProductVariant.ISummary = {
    id: variantId,
    sku_code: RandomGenerator.alphaNumeric(12),
    option_values: JSON.stringify({ color: "red", size: "L" }),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    stock_quantity: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    product: product,
  };
  typia.assert(variant);
  // 4. Query: Get inventory history with default pagination (20 records per page)
  const response =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: { search: null },
      },
    );
  typia.assert(response);
  // 5. Validate: Check pagination metadata structure
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== null,
  );
  TestValidator.predicate(
    "pagination has current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    response.pagination.pages >= 0,
  );
  // 6. Validate: Check data array exists and structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );
  // 7. Validate: Each record has required fields (validated by typia.assert(response))
  if (response.data.length > 0) {
    const sampleRecord = response.data[0];
    TestValidator.predicate("record has id", sampleRecord.id !== undefined);
    TestValidator.predicate(
      "record has quantity_change",
      sampleRecord.quantity_change !== undefined,
    );
    TestValidator.predicate(
      "record has operation_type",
      sampleRecord.operation_type !== undefined,
    );
    TestValidator.predicate(
      "record has created_at",
      sampleRecord.created_at !== undefined,
    );
    TestValidator.predicate(
      "record has productVariant",
      sampleRecord.productVariant !== undefined,
    );
  }
  // 8. Validate: Records should be sorted by created_at descending if data exists
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      TestValidator.predicate(
        `record ${i} created_at >= record ${i + 1} created_at`,
        new Date(response.data[i].created_at) >=
          new Date(response.data[i + 1].created_at),
      );
    }
  }
}
