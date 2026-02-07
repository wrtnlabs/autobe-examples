import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_resets_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  // 2. Retrieve password reset tokens
  const passwordResets =
    await api.functional.ecommerce.seller.seller_password_resets.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceSellerPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResets);
  // 3. Validate the response
  TestValidator.equals(
    "should have records",
    passwordResets.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "should have valid shop name",
    passwordResets.data.length > 0 &&
      typeof passwordResets.data[0].seller.shopName === "string",
    true,
  );
  TestValidator.predicate(
    "should have valid status",
    ["pending", "approved", "rejected"].includes(
      passwordResets.data[0].seller.status,
    ),
  );
}
