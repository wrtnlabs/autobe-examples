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

export async function test_api_category_products_pagination_stability(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const first =
    await api.functional.mallPlatform.customer.categories.products.at(
      customerConnection,
      {
        categoryId,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.customer.categories.products.at(
      customerConnection,
      {
        categoryId,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination metadata current",
    first.pagination.current,
    second.pagination.current,
  );
  TestValidator.equals(
    "pagination metadata limit",
    first.pagination.limit,
    second.pagination.limit,
  );
  TestValidator.equals(
    "pagination metadata records",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "pagination metadata pages",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals(
    "stable ordering across repeated requests",
    first.data,
    second.data,
  );
  TestValidator.predicate(
    "pagination metadata is non-negative",
    () =>
      first.pagination.current >= 0 &&
      first.pagination.limit >= 0 &&
      first.pagination.records >= 0 &&
      first.pagination.pages >= 0,
  );
  for (const product of first.data) {
    typia.assert<IMallPlatformProduct.ISummary>(product);
    TestValidator.predicate("product id is present", product.id.length > 0);
    TestValidator.predicate("product name is present", product.name.length > 0);
    TestValidator.predicate(
      "product description is present",
      product.description.length > 0,
    );
    TestValidator.predicate(
      "product base price is non-negative",
      product.basePrice >= 0,
    );
    typia.assert<IMallPlatformSellerAccount.ISummary>(product.sellerAccount);
    if (product.category !== null) {
      typia.assert<IMallPlatformCategory.ISummary>(product.category);
    }
  }
  if (first.data.length > 0) {
    const repeated =
      await api.functional.mallPlatform.customer.categories.products.at(
        customerConnection,
        {
          categoryId,
        },
      );
    typia.assert(repeated);
    TestValidator.equals(
      "repeated request stability for first page data",
      first.data,
      repeated.data,
    );
  }
}
