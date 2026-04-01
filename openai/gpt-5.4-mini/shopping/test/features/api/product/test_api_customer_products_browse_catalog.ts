import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function test_api_customer_products_browse_catalog(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer-facing catalog browsing with default parameters.
   * 1. Register and authenticate a customer through the join utility.
   * 2. Browse the product catalog without filters.
   * 3. Validate page metadata and product summary contents.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const output = await api.functional.mallPlatform.customer.products.index(
    customerConnection,
    { body: {} satisfies IMallPlatformProduct.IRequest },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination record count should cover returned rows",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current page should be non-negative",
    output.pagination.current >= 0,
  );
  for (const product of output.data) {
    typia.assert(product);
    TestValidator.predicate("product id should exist", product.id.length > 0);
    TestValidator.predicate(
      "product name should exist",
      product.name.length > 0,
    );
    TestValidator.predicate(
      "product description should exist",
      product.description.length > 0,
    );
    TestValidator.predicate(
      "base price should be non-negative",
      product.basePrice >= 0,
    );
    TestValidator.predicate(
      "seller account id should exist",
      product.sellerAccount.id.length > 0,
    );
    TestValidator.predicate(
      "seller email should exist",
      product.sellerAccount.email.length > 0,
    );
    TestValidator.predicate(
      "seller approval status should exist",
      product.sellerAccount.approvalStatus.length > 0,
    );
    TestValidator.predicate(
      "seller timestamps should exist",
      product.sellerAccount.createdAt.length > 0 &&
        product.sellerAccount.updatedAt.length > 0,
    );
    if (product.category !== null) {
      TestValidator.predicate(
        "category id should exist",
        product.category.id.length > 0,
      );
      TestValidator.predicate(
        "category name should exist",
        product.category.name.length > 0,
      );
      TestValidator.predicate(
        "category description should exist",
        product.category.description.length > 0,
      );
      TestValidator.predicate(
        "category timestamps should exist",
        product.category.createdAt.length > 0 &&
          product.category.updatedAt.length > 0,
      );
    }
    TestValidator.predicate(
      "product timestamps should exist",
      product.createdAt.length > 0 && product.updatedAt.length > 0,
    );
    TestValidator.equals(
      "product deletedAt should be null",
      product.deletedAt,
      null,
    );
  }
}
