import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_images_index(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Call sale_images.index with no filters to get first page
  const response =
    await api.functional.shoppingMall.administrator.sale_images.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // Validate pagination
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page must be >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent with records and limit",
    pagination.pages ===
      (pagination.limit > 0
        ? Math.ceil(pagination.records / pagination.limit)
        : 0),
  );
  // Validate each sale image summary
  for (const imgSummary of data) {
    typia.assert(imgSummary);
  }
}
