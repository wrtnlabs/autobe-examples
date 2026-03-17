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

export async function test_api_administrator_request_detail_customer_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const created =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(created);
  const baseline: IShoppingMallAdministratorRequest = created;
  await TestValidator.httpError(
    "customer cannot read administrator request detail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.administrator_requests.at(
        customerConnection,
        {
          administratorRequestId: created.id,
        },
      );
    },
  );
  TestValidator.equals("created request id preserved", created.id, baseline.id);
  TestValidator.equals(
    "applicant type is customer",
    created.applicant_type,
    "customer",
  );
  TestValidator.equals("reason unchanged", created.reason, baseline.reason);
  TestValidator.equals("status unchanged", created.status, baseline.status);
  TestValidator.equals("review note remains absent", created.review_note, null);
  TestValidator.equals(
    "rejection reason remains absent",
    created.rejection_reason,
    null,
  );
  TestValidator.equals("reviewed at remains null", created.reviewed_at, null);
  TestValidator.equals("approved at remains null", created.approved_at, null);
  TestValidator.equals("rejected at remains null", created.rejected_at, null);
  TestValidator.equals(
    "reviewer remains absent",
    created.reviewedByAdministrator,
    null,
  );
  TestValidator.equals("not soft deleted", created.deleted_at, null);
}
