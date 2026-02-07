import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_join_with_valid_business_email_and_password(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  // Create business domain email (e.g., john@example.com)
  const username = RandomGenerator.name(2).replace(/ /g, "");
  const email = `${username}@example.com`;
  // Create seller account
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: email,
      password: RandomGenerator.alphaNumeric(10),
    },
  });
  // Validate response
  typia.assert(seller);
  // Validate approval status
  TestValidator.equals("approval status", seller.approval_status, "pending");
}
