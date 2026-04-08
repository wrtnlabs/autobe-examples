import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_product_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call admin product listing with default pagination
  const response =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals(
    "pagination has current page",
    response.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    response.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    response.pagination.pages >= 0,
    true,
  );
  // 4. Validate pagination calculation is correct
  if (response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculated correctly",
      response.pagination.pages,
      expectedPages,
    );
  }
  // 5. Validate products are sorted by createdAt descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `Product at index ${i} should have newer or equal createdAt than product at index ${i + 1}`,
        current >= next,
      );
    }
  }
  // 6. Validate product summary structure
  for (const product of response.data) {
    TestValidator.equals("product has valid UUID", product.id.length > 0, true);
    TestValidator.equals("product has name", product.name.length > 0, true);
    TestValidator.equals("product has basePrice", product.basePrice >= 0, true);
    TestValidator.equals(
      "product has categoryName",
      product.categoryName !== undefined,
      true,
    );
    TestValidator.equals(
      "product has hasStock",
      typeof product.hasStock === "boolean",
      true,
    );
    TestValidator.equals(
      "product has createdAt",
      product.createdAt.length > 0,
      true,
    );
    TestValidator.equals(
      "product has updatedAt",
      product.updatedAt.length > 0,
      true,
    );
    // Seller info should be present in admin view
    if (product.seller) {
      TestValidator.equals("seller has id", product.seller.id.length > 0, true);
      TestValidator.equals(
        "seller has email",
        product.seller.email.length > 0,
        true,
      );
    }
  }
}
