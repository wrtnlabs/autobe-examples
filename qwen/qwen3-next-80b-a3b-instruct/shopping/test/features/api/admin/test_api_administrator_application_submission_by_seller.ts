import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_admin_password_reset } from "../../../prepare/prepare_random_shopping_mall_admin_password_reset";
import { generate_random_shopping_mall_seller_admins_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admins_requests_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_administrator_application_submission_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Step 2: Use the authenticated seller connection to submit an admin application
  const adminApplication =
    await generate_random_shopping_mall_seller_admins_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(adminApplication);
  // Step 3: Validate the admin application response
  await TestValidator.equals(
    "status should be pending",
    adminApplication.status,
    "pending",
  );
  await TestValidator.predicate("adminRequestId should be a valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminApplication.adminRequestId,
    ),
  );
  await TestValidator.predicate("requestedAt should be a valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      adminApplication.requestedAt,
    ),
  );
  await TestValidator.equals(
    "reason length should be between 1 and 500 characters",
    adminApplication.reason.length >= 1 &&
      adminApplication.reason.length <= 500,
    true,
  );
  await TestValidator.predicate(
    "reason should contain meaningful text",
    () =>
      adminApplication.reason.length > 0 &&
      adminApplication.reason.trim().length > 0,
  );
}
