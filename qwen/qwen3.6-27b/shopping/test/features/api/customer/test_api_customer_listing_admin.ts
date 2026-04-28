import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_listing_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as platform administrator using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Step 2: Create request with explicit pagination parameters
  const request = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommercePlatformCustomer.IRequest;
  // Step 3: Execute customer listing query with admin authorization
  const result = await api.functional.ecommercePlatform.customers.index(
    adminConnection,
    { body: request },
  );
  typia.assert(result);
  // Step 4: Validate pagination metadata matches request parameters
  TestValidator.equals(
    "pagination current page matches request",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination pages is at least 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is at least 0",
    result.pagination.records >= 0,
  );
  // Step 5: Validate data array respects limit constraint
  TestValidator.predicate(
    "data array length does not exceed limit",
    result.data.length <= 50,
  );
}
