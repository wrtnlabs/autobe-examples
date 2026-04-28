import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_success_with_auto_created_entities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register new seller using utility function
  const seller: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: "https://example.com",
        referrer: "https://example.com",
      },
    });
  // 3. Validate response structure
  typia.assert(seller);
  // 4. Validate business logic
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals("is_banned is false", seller.is_banned, false);
  TestValidator.equals(
    "rejection reason is null",
    seller.rejection_reason,
    null,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token exists",
    seller.token.access !== undefined,
  );
  TestValidator.predicate(
    "refresh token exists",
    seller.token.refresh !== undefined,
  );
}
