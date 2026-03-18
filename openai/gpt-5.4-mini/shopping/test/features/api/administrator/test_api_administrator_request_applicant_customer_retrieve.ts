import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallAdministratorRequestApplicantCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_applicant_customer_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.shoppingMall.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const adminRequestId = typia.random<string & tags.Format<"uuid">>();
  const administratorRequestApplicantCustomerId = typia.random<
    string & tags.Format<"uuid">
  >();
  const output =
    await api.functional.shoppingMall.administrator.administrator_requests.applicant_customers.getByAdministratorrequestidAndAdministratorrequestapplicantcustomerid(
      adminConnection,
      {
        administratorRequestId: adminRequestId,
        administratorRequestApplicantCustomerId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "administrator request id",
    output.administratorRequest.id,
    adminRequestId,
  );
  TestValidator.equals(
    "applicant link id",
    output.id,
    administratorRequestApplicantCustomerId,
  );
  TestValidator.predicate(
    "administrator request summary exists",
    output.administratorRequest.reason.length > 0 &&
      output.administratorRequest.status.length > 0,
  );
  TestValidator.predicate(
    "customer summary exists",
    output.customer.email.length > 0 &&
      output.customer.accountStatus.length > 0,
  );
  TestValidator.equals(
    "timestamps preserved",
    output.created_at,
    output.created_at,
  );
}
