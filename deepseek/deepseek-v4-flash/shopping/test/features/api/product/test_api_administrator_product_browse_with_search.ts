import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_browse_with_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  // 2. Search products with a random keyword
  const searchKeyword = RandomGenerator.alphabets(8);
  const response =
    await api.functional.eCommerceMall.administrator.products.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
          page: 1,
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid fields",
    () =>
      response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0 &&
      response.pagination.current <= response.pagination.pages + 1,
  );
  // 4. Validate returned products
  if (response.data.length > 0) {
    // All returned products should have visibility = 'visible'
    TestValidator.predicate("all products are visible", () =>
      response.data.every((product) => product.visibility === "visible"),
    );
    // All returned products should match the search keyword in their name (ILIKE pattern matching)
    TestValidator.predicate("products match search keyword", () =>
      response.data.every((product) =>
        product.name.toLowerCase().includes(searchKeyword.toLowerCase()),
      ),
    );
    // Each product summary should include expected fields
    for (const product of response.data) {
      TestValidator.predicate(
        "product has id",
        () => typeof product.id === "string",
      );
      TestValidator.predicate(
        "product has name",
        () => typeof product.name === "string",
      );
      TestValidator.predicate(
        "product has base_price",
        () => typeof product.base_price === "number",
      );
      TestValidator.predicate(
        "product has seller with shop_name",
        () =>
          typeof product.seller === "object" &&
          typeof product.seller.profile.shop_name === "string",
      );
      TestValidator.predicate(
        "product has timestamps",
        () =>
          typeof product.created_at === "string" &&
          typeof product.updated_at === "string",
      );
    }
  }
}
