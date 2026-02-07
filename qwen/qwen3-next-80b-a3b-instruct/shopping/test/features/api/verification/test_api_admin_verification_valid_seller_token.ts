import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_verification_valid_seller_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a direct connection (no authentication needed for this endpoint)
  const directConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID token (simulating a seller verification token)
  const sellerToken = typia.random<string & tags.Format<"uuid">>();
  // Call the verification endpoint with the seller token
  const verification = await api.functional.shoppingMall.admin.verification.at(
    directConnection,
    {
      token: sellerToken,
    },
  );
  typia.assert(verification);
  // Validate response structure
  TestValidator.equals("type should be seller", (verification as any).type, "seller");
  TestValidator.equals("status should be valid", (verification as any).status, "valid");
}