import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_browse_catalog_listing(
  connection: api.IConnection,
): Promise<void> {
  const browseConnection: api.IConnection = { host: connection.host };
  const body = {
    page: 1,
    limit: 10,
    sort: "newest",
  } satisfies IMallPlatformProduct.IRequest;
  const output = await api.functional.mallPlatform.products.index(
    browseConnection,
    {
      body,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current should match requested page",
    output.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    output.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data should not exceed requested limit",
    output.data.length <= body.limit,
  );
  for (let i = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      "newest-first ordering should be respected",
      output.data[i - 1].createdAt >= output.data[i].createdAt,
    );
  }
  for (const product of output.data) {
    TestValidator.predicate(
      "product summary should include an identifier",
      product.id.length > 0,
    );
    TestValidator.predicate(
      "seller summary should be included",
      product.sellerAccount.id.length > 0 &&
        product.sellerAccount.email.length > 0,
    );
    TestValidator.predicate(
      "category summary should be included when present",
      product.category === null || product.category.id.length > 0,
    );
  }
}
