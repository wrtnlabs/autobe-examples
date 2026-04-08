import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspension_history_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an administrator account and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  // Step 2: Create a seller UUID for a seller with no suspension history
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Retrieve suspension history for the seller
  const result: IPageIEcommerceMallSellerSuspension.ISummary =
    await api.functional.ecommerceMall.administrator.sellers.suspension_history.history(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(result);
  // Step 4: Validate empty results with correct pagination metadata
  TestValidator.equals(
    "pagination current page is default 1",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid positive number",
    result.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records is 0 for empty results",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 when records is 0",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array is empty for seller with no suspension history",
    result.data.length,
    0,
  );
}
