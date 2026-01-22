import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_search_by_email_domain(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const createdAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(createdAdmin);
  // Create multiple test admin accounts with different email domains
  const companyEmails = ["company.com", "company.org", "company.net"];
  const adminAccounts = [];
  // Create at least 3 admins with different domain patterns
  for (const domain of companyEmails) {
    const adminEmail = `admin-${RandomGenerator.alphaNumeric(5)}@${domain}`;
    const createdAdmin = await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListAdmin.IJoin,
    });
    typia.assert(createdAdmin);
    adminAccounts.push(createdAdmin);
  }
  // Create additional admin with different domain to ensure filtering works
  const otherDomainAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin-other@external.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(otherDomainAdmin);
  // Extract domain to search for from one of the created admins
  const searchDomain = "company.com";
  // Search administrators with email domain filter
  const searchResponse = await api.functional.todoList.admin.admins.index(
    adminConnection,
    {
      body: {
        emailDomain: searchDomain, // Use extracted domain
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        order: "asc",
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate that results only contain admin accounts with the search domain
  const domainMatchCount = searchResponse.data.filter((admin) =>
    admin.email.endsWith(searchDomain),
  ).length;
  // Verify all returned admins have the target domain and no others
  TestValidator.equals(
    "all search results contain the specified domain",
    searchResponse.data.length,
    domainMatchCount,
  );
  // Validate pagination info
  TestValidator.equals(
    "pagination page matches request",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchResponse.pagination.limit,
    10,
  );
  // Verify sorting by createdAt in ascending order using updated_at as proxy
  // Create a sorted copy of the response data
  const sortedByTimestamp = [...searchResponse.data].sort(
    (a, b) =>
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
  );
  // Use TestValidator.index to validate exact order matching with our sorted data
  TestValidator.index(
    "results sorted by updated_at in ascending order",
    sortedByTimestamp satisfies any[] as any[],
    searchResponse.data satisfies any[] as any[],
  );
  // Verify that at least one account with the domain was found
  TestValidator.predicate(
    "at least one admin with target domain found",
    searchResponse.data.length > 0,
  );
  // Verify that the other domain account (external.com) was properly filtered out
  const otherDomainFound = searchResponse.data.some((admin) =>
    admin.email.endsWith("external.com"),
  );
  TestValidator.equals(
    "external.com domain admin filtered out",
    otherDomainFound,
    false,
  );
}