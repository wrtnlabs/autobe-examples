import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipping_addresses_browse_own_addresses(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@example.com" as string,
      password: "password1234" as string,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    page: 1,
    limit: 50,
    sort: "newest",
  } satisfies IMallPlatformShippingAddress.IRequest;
  const output =
    await api.functional.mallPlatform.customer.shipping_addresses.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "browse response page matches request",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "browse response limit matches request",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "browse response records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "browse response pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "browse result data is an array",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "every shipping address summary is active",
    output.data.every((address) => address.deletedAt === null),
  );
}
