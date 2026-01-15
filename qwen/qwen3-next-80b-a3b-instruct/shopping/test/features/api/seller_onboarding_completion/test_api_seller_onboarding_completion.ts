import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IStatus";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_onboarding_completion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate valid sellerId (UUID format) - no seller creation function available
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: First call to complete onboarding
  const firstCompletion: IStatus =
    await api.functional.shoppingMall.admin.sellers.onboarding_completion.update(
      adminConnection, // Use adminConnection, NOT base connection
      {
        sellerId: sellerId,
      },
    );
  typia.assert(firstCompletion);
  TestValidator.equals(
    "onboarding completion successful",
    firstCompletion.successful,
    true,
  );
  // Step 4: Second call for idempotency test
  const secondCompletion: IStatus =
    await api.functional.shoppingMall.admin.sellers.onboarding_completion.update(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(secondCompletion);
  TestValidator.equals(
    "onboarding completion idempotent",
    secondCompletion.successful,
    true,
  );
}
