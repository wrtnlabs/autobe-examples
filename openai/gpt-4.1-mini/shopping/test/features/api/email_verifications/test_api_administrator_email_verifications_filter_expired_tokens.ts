import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_email_verifications_filter_expired_tokens(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test filtering email verification records with expired tokens before a specified date, as an authorized administrator.
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(adminAuth);
  // Update adminConnection with Authorization header
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Determine filter date for expired tokens
  // Use current date shifted some days back to ensure tokens exist before that
  const filterDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  // 3. Call the email_verifications.index endpoint with expiresAtBefore filter
  const body: IShoppingMallCustomerEmailVerification.IRequest = {
    expiresAtBefore: filterDate,
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.shoppingMall.administrator.email_verifications.index(
      adminConnection,
      { body },
    );
  typia.assert(response);
  // 4. Validate the response pagination
  TestValidator.predicate(
    "pagination.current is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    response.pagination.records >= 0,
  );
  // 5. Validate that each email verification record expires before filterDate
  for (const ev of response.data) {
    typia.assert(ev);
    TestValidator.predicate(
      `email verification expiresAt (${ev.expiresAt}) < filterDate (${filterDate})`,
      new Date(ev.expiresAt).getTime() <= new Date(filterDate).getTime(),
    );
  }
  // 6. Validate access control: non-admins should not access this endpoint
  // Create generic connection without auth
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access disallowed", async () => {
    await api.functional.shoppingMall.administrator.email_verifications.index(
      unauthorizedConnection,
      { body },
    );
  });
}
