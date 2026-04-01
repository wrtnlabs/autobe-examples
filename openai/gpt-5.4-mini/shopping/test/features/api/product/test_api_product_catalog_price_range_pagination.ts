import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_catalog_price_range_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const request = {
    minPrice: 100,
    maxPrice: 300,
    page: 1,
    limit: 10,
    sort: "priceAsc",
  } satisfies IMallPlatformProduct.IRequest;
  const output = await api.functional.mallPlatform.administrator.products.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(output.data));
  TestValidator.predicate(
    "all products are within requested price range",
    output.data.every(
      (product) => product.basePrice >= 100 && product.basePrice <= 300,
    ),
  );
  for (const product of output.data) {
    TestValidator.predicate("product id is present", product.id.length > 0);
    TestValidator.predicate("product name is present", product.name.length > 0);
    TestValidator.predicate(
      "product description is present",
      product.description.length > 0,
    );
    TestValidator.predicate(
      "seller account summary is present",
      product.sellerAccount.id.length > 0,
    );
    TestValidator.predicate(
      "product is not deleted",
      product.deletedAt === null,
    );
  }
  const beyondPage = Math.max(output.pagination.pages + 1, 2);
  const nextPage =
    await api.functional.mallPlatform.administrator.products.index(
      adminConnection,
      {
        body: {
          ...request,
          page: beyondPage,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(nextPage);
  TestValidator.equals(
    "next page current matches request",
    nextPage.pagination.current,
    beyondPage,
  );
  TestValidator.equals("next page limit", nextPage.pagination.limit, 10);
  TestValidator.equals(
    "next page records",
    nextPage.pagination.records,
    output.pagination.records,
  );
  TestValidator.equals("next page data length", nextPage.data.length, 0);
}
