import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_customer_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(admin);
  // 2. Retrieve all active customers with default pagination
  const customersConnection: api.IConnection = { host: connection.host };
  const response: IPageIEcommerceMallMember.ISummary =
    await api.functional.ecommerceMall.administrator.customers.index(
      customersConnection,
      {
        body: {} satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate customer summary fields
  for (let i = 0; i < response.data.length; i++) {
    const customer: IEcommerceMallMember.ISummary = response.data[i];
    typia.assert(customer);
    // Validate deleted_at is null for active accounts
    TestValidator.equals(
      "customer deleted_at is null for active account",
      customer.deleted_at,
      null,
    );
  }
  // 5. Verify default sorting by created_at DESC
  if (response.data.length >= 2) {
    for (let i = 1; i < response.data.length; i++) {
      const prev: IEcommerceMallMember.ISummary = response.data[i - 1];
      const curr: IEcommerceMallMember.ISummary = response.data[i];
      TestValidator.predicate(
        "customers sorted by created_at DESC",
        new Date(prev.created_at).getTime() >=
          new Date(curr.created_at).getTime(),
      );
    }
  }
}
