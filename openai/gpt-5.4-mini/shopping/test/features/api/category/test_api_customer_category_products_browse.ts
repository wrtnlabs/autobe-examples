import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_customer_category_products_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  TestValidator.predicate(
    "each product summary contains the list-view fields",
    output.data.every((product) => {
      const sellerAccount = product.sellerAccount;
      const category = product.category;
      return (
        (typeof product.id === "string" &&
          typeof product.name === "string" &&
          typeof product.description === "string" &&
          typeof product.basePrice === "number" &&
          typeof product.createdAt === "string" &&
          typeof product.updatedAt === "string" &&
          typeof product.deletedAt === "object") ||
        (typeof product.deletedAt === "string" &&
          typeof sellerAccount.id === "string" &&
          typeof sellerAccount.email === "string" &&
          typeof sellerAccount.approvalStatus === "string" &&
          typeof sellerAccount.rejectionReason === "string") ||
        (sellerAccount.rejectionReason === null &&
          typeof sellerAccount.suspendedAt === "object") ||
        (typeof sellerAccount.suspendedAt === "string" &&
          typeof sellerAccount.deletedAt === "object") ||
        (typeof sellerAccount.deletedAt === "string" &&
          typeof sellerAccount.createdAt === "string" &&
          typeof sellerAccount.updatedAt === "string" &&
          (category === null ||
            (typeof category.id === "string" &&
              typeof category.name === "string" &&
              typeof category.description === "string" &&
              (category.parentCategory === null ||
                typeof category.parentCategory.id === "string") &&
              typeof category.createdAt === "string" &&
              typeof category.updatedAt === "string" &&
              typeof category.deletedAt === "object") ||
            typeof category.deletedAt === "string"))
      );
    }),
  );
  TestValidator.predicate(
    "no deep product detail fields are exposed in the summary response",
    output.data.every(
      (product) => !("variants" in product) && !("snapshots" in product),
    ),
  );
}
