import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_pending_does_not_confer_admin_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const requestBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdministratorRequest.ICreate;
  const administratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(administratorRequest);
  TestValidator.equals(
    "administrator request reason matches input",
    administratorRequest.reason,
    requestBody.reason,
  );
  TestValidator.equals(
    "administrator request is pending",
    administratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "review note remains unset while pending",
    administratorRequest.review_note,
    null,
  );
  TestValidator.equals(
    "rejection reason remains unset while pending",
    administratorRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewed at remains unset while pending",
    administratorRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "approved at remains unset while pending",
    administratorRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected at remains unset while pending",
    administratorRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer remains unset while pending",
    administratorRequest.reviewedByAdministrator,
    null,
  );
  await TestValidator.httpError(
    "pending administrator request does not grant administrator category access",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.administrator.categories.at(
        customerConnection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
