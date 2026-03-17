import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_customer_submission_pending(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customer);
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallAdministratorRequest.ICreate;
  const request: IShoppingMallAdministratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body,
      },
    );
  typia.assert(request);
  TestValidator.equals(
    "submitted reason is preserved",
    request.reason,
    body.reason,
  );
  TestValidator.equals(
    "applicant type derived from authenticated customer",
    request.applicant_type,
    "customer",
  );
  TestValidator.equals(
    "new request starts in pending state",
    request.status,
    "pending",
  );
  TestValidator.equals(
    "review note is unset on submission",
    request.review_note,
    null,
  );
  TestValidator.equals(
    "rejection reason is unset on submission",
    request.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewed_at is unset on submission",
    request.reviewed_at,
    null,
  );
  TestValidator.equals(
    "approved_at is unset on submission",
    request.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is unset on submission",
    request.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewedByAdministrator is unset on submission",
    request.reviewedByAdministrator,
    null,
  );
  TestValidator.notEquals(
    "submission is not an approval action",
    request.status,
    "approved",
  );
  TestValidator.notEquals(
    "submission is not a rejection action",
    request.status,
    "rejected",
  );
}
