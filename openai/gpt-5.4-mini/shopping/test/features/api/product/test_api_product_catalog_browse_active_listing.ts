import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_catalog_browse_active_listing(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const output = await api.functional.mallPlatform.seller.products.index(
    sellerConnection,
    {
      body: {} satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned items do not exceed page limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "pagination metadata is consistent with returned items",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pagination pages are compatible with record count",
    output.pagination.records === 0
      ? output.pagination.pages === 0
      : output.pagination.pages >= 1,
  );
  for (const product of output.data) {
    TestValidator.equals(
      "browse list should expose active products only",
      product.deletedAt,
      null,
    );
    TestValidator.predicate(
      "seller summary context is present",
      product.sellerAccount.approvalStatus.length > 0,
    );
    if (product.category !== null) {
      TestValidator.predicate(
        "category summary context is present",
        product.category.parentCategory === null ||
          typeof product.category.parentCategory.name === "string",
      );
    }
  }
}
