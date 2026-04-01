import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_seller_profile_browse_active_profiles(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    sort: "shopName_asc",
    page: 1,
    limit: 10,
  } satisfies IMallPlatformSellerProfile.IRequest;
  const output =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page number",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "requested page limit",
    output.pagination.limit,
    request.limit,
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
    "data length does not exceed limit",
    output.data.length <= request.limit,
  );
  const repeated =
    await api.functional.mallPlatform.customer.sellerProfiles.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "stable pagination current",
    repeated.pagination.current,
    output.pagination.current,
  );
  TestValidator.equals(
    "stable pagination limit",
    repeated.pagination.limit,
    output.pagination.limit,
  );
  TestValidator.equals(
    "stable pagination records",
    repeated.pagination.records,
    output.pagination.records,
  );
  TestValidator.equals(
    "stable pagination pages",
    repeated.pagination.pages,
    output.pagination.pages,
  );
  TestValidator.equals(
    "stable result count",
    repeated.data.length,
    output.data.length,
  );
  TestValidator.equals(
    "stable first page identifiers",
    repeated.data.map((profile) => profile.id),
    output.data.map((profile) => profile.id),
  );
}
