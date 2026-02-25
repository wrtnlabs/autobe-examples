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

export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and register using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const response = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Validate complete response structure - this validates ALL types, formats, and constraints
  typia.assert(response);
  // Test business logic: account should be in pending_approval status after registration
  TestValidator.equals(
    "account status is pending_approval",
    response.account_status,
    "pending_approval",
  );
  // Test authentication behavior: utility function should set Authorization header
  await TestValidator.predicate(
    "connection headers include Authorization",
    !!sellerConnection.headers && "Authorization" in sellerConnection.headers,
  );
  // Validate authentication token structure (business behavior, not type validation)
  await TestValidator.predicate(
    "authentication token was generated",
    response.token.access.length > 0 && response.token.refresh.length > 0,
  );
}