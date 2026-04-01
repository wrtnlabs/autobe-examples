import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_reject_unavailable_variant_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const baselineRequest = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformShoppingCart.IRequest;
  const baseline = await api.functional.mallPlatform.customer.carts.index(
    customerConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baseline);
  const invalidUpdateRequest = {
    shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  } satisfies IMallPlatformShoppingCart.IRequest;
  await TestValidator.httpError(
    "reject unavailable variant cart update",
    [400, 404, 409, 422],
    async () => {
      await api.functional.mallPlatform.customer.carts.index(
        customerConnection,
        {
          body: invalidUpdateRequest,
        },
      );
    },
  );
  const afterFailure = await api.functional.mallPlatform.customer.carts.index(
    customerConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(afterFailure);
  TestValidator.equals(
    "cart page should remain unchanged",
    afterFailure,
    baseline,
  );
}
