import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshots_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // Description: Test retrieval of seller profile snapshots when no records match.
  // Create admin connection and authorize administrator.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "StrongP@ssw0rd",
    },
  });
  // Prepare a request with impossible filter criteria to get empty results.
  const body: IShoppingMallSellerProfileSnapshot.IRequest = {
    sellerId: "00000000-0000-0000-0000-000000000000",
    createdAtGte: new Date().toISOString(),
    createdAtLte: new Date().toISOString(),
    shopName: "non_existing_shop_name_xyz",
    shopDescription: "no_matching_description_xyz",
    offset: 0,
    limit: 10,
    page: 1,
  };
  // Call the API endpoint to retrieve seller profile snapshots.
  const output =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.index(
      adminConnection,
      { body },
    );
  // Assert the response conforms to the expected type.
  typia.assert(output);
  // Validate that the data array is empty.
  TestValidator.equals("empty data array", output.data.length, 0);
  // Validate that pagination metadata indicates zero records.
  TestValidator.equals("pagination record count", output.pagination.records, 0);
  // Validate that the current page is 1 and total pages is 0.
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination total pages", output.pagination.pages, 0);
  // Validate that the limit in pagination matches request limit.
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
}
