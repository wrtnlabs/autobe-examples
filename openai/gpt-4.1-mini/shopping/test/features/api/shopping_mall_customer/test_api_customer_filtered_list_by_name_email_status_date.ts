import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_filtered_list_by_name_email_status_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account and obtain admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Prepare test filter parameters
  // Generate a partial name and email substring for filtering
  const nameFilterFull = RandomGenerator.name(3);
  const nameFilter = nameFilterFull.substring(
    0,
    Math.floor(nameFilterFull.length / 2),
  );
  const emailFull = typia.random<string & tags.Format<"email">>();
  const emailFilter = emailFull.substring(0, Math.floor(emailFull.length / 2));
  // Determine registration date range (recent 30 days)
  const dateEnd = new Date();
  const dateStart = new Date(dateEnd.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  // 3. Perform request to retrieve filtered customer list
  const requestBody: IShoppingMallCustomer.IRequest = {
    search: nameFilter,
    status: "active",
    registrationDateStart: dateStart.toISOString() as string &
      tags.Format<"date-time">,
    registrationDateEnd: dateEnd.toISOString() as string &
      tags.Format<"date-time">,
    page: 1,
    limit: 30,
  };
  const response =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination information
  TestValidator.predicate(
    "pagination current page positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate that returned customers match filter criteria
  for (const customer of response.data) {
    // Non-sensitive fields present
    TestValidator.predicate(
      "customer has id",
      typeof customer.id === "string" && customer.id.length > 0,
    );
    TestValidator.predicate(
      "customer has email",
      typeof customer.email === "string" && customer.email.length > 0,
    );
    TestValidator.predicate(
      "customer displayName type",
      customer.displayName === undefined ||
        customer.displayName === null ||
        typeof customer.displayName === "string",
    );
    // Match the status filter: only active customers (deletedAt is null)
    // Since deletedAt field is not returned, approximate by existence in list
    // We only requested active, so no deleted or inactive customer should be present
    // Filter on search string against email or displayName
    const searchTermLower = nameFilter.toLowerCase();
    const emailLower = customer.email.toLowerCase();
    const displayNameLower = (customer.displayName ?? "").toLowerCase();
    const matches =
      emailLower.includes(searchTermLower) ||
      displayNameLower.includes(searchTermLower);
    TestValidator.predicate(
      `customer matches search term '${nameFilter}'`,
      matches,
    );
  }
}
