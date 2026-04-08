import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_requests_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create 3 customer accounts with their credentials
  const customerAccounts = await ArrayUtil.asyncRepeat(
    3,
    async (index: number) => {
      const customerConnection: api.IConnection = { host: connection.host };
      const password = `Customer${index}Password123`;
      const customerAuth = await authorize_member_join(customerConnection, {
        body: {
          email: `customer${index}@${RandomGenerator.alphabets(6)}.test.com`,
          password,
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
      typia.assert(customerAuth);
      return {
        auth: customerAuth,
        password,
      };
    },
  );
  // 3. Submit administrator approval requests as each customer
  const approvalRequests = await ArrayUtil.asyncMap(
    customerAccounts,
    async (customer, index: number) => {
      const customerConnection: api.IConnection = { host: connection.host };
      await authorize_member_login(customerConnection, {
        body: {
          email: customer.auth.email,
          password: customer.password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
      const request =
        await api.functional.ecommerceMall.member.administrator_approval_requests.create(
          customerConnection,
          {
            body: {
              requestingMemberId: customer.auth.id,
              reason: `Request ${index + 1}: Seeking administrator privileges to manage ${RandomGenerator.alphabets(5)} activities`,
            },
          },
        );
      typia.assert(request);
      return request;
    },
  );
  // 4. Call index endpoint with status='pending'
  const result =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 20,
        },
      },
    );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    3,
  );
  TestValidator.equals("pagination total pages", result.pagination.pages, 1);
  // 6. Validate data array contains all pending requests
  TestValidator.equals(
    "data array length matches records",
    result.data.length,
    3,
  );
  // 7. Verify all requests have status='pending'
  result.data.forEach(
    (request: IEcommerceMallAdministratorApprovalRequests.ISummary) => {
      TestValidator.equals(
        "request status is pending",
        request.status,
        "pending",
      );
    },
  );
  // 8. Verify each request has required fields
  result.data.forEach(
    (request: IEcommerceMallAdministratorApprovalRequests.ISummary) => {
      TestValidator.predicate(
        "request has id",
        request.id !== null && request.id !== undefined,
      );
      TestValidator.predicate(
        "request has non-empty reason",
        request.reason !== null && request.reason.length > 0,
      );
      TestValidator.predicate(
        "request has requesting_member_id",
        request.requesting_member_id !== null &&
          request.requesting_member_id !== undefined,
      );
      TestValidator.predicate(
        "request has created_at",
        request.created_at !== null && request.created_at !== undefined,
      );
      TestValidator.predicate(
        "request has updated_at",
        request.updated_at !== null && request.updated_at !== undefined,
      );
      TestValidator.predicate(
        "request has deleted_at",
        request.deleted_at === null,
      );
    },
  );
  // 9. Verify customer IDs are valid UUIDs and match created accounts
  const createdCustomerIds = customerAccounts.map((c) => c.auth.id);
  const requestMemberIds = result.data
    .map(
      (r: IEcommerceMallAdministratorApprovalRequests.ISummary) =>
        r.requesting_member_id,
    )
    .filter((id): id is string => id !== null && id !== undefined);
  TestValidator.equals(
    "all requests have member IDs",
    requestMemberIds.length,
    3,
  );
  createdCustomerIds.forEach((customerId: string) => {
    TestValidator.equals(
      `request contains customer ${customerId}`,
      requestMemberIds.includes(customerId),
      true,
    );
  });
  // 10. Verify all reasons are unique
  const reasons = result.data.map(
    (r: IEcommerceMallAdministratorApprovalRequests.ISummary) => r.reason,
  );
  const uniqueReasons = new Set(reasons);
  TestValidator.equals(
    "all reasons are unique",
    uniqueReasons.size,
    reasons.length,
  );
  // 11. Verify timestamps are valid ISO 8601 format
  result.data.forEach(
    (
      request: IEcommerceMallAdministratorApprovalRequests.ISummary,
      index: number,
    ) => {
      const createdDate = new Date(request.created_at);
      const updatedDate = new Date(request.updated_at);
      TestValidator.predicate(
        `request ${index} created_at is valid date`,
        !isNaN(createdDate.getTime()),
      );
      TestValidator.predicate(
        `request ${index} updated_at is valid date`,
        !isNaN(updatedDate.getTime()),
      );
    },
  );
  // 12. Verify requests are sorted by created_at DESC (newest first)
  for (let i = 1; i < result.data.length; i++) {
    const prevCreatedAt = new Date(result.data[i - 1].created_at).getTime();
    const currCreatedAt = new Date(result.data[i].created_at).getTime();
    TestValidator.predicate(
      `request ${i} sorted correctly`,
      prevCreatedAt >= currCreatedAt,
    );
  }
  // 13. Verify created_at <= updated_at for all requests
  result.data.forEach(
    (request: IEcommerceMallAdministratorApprovalRequests.ISummary) => {
      const createdTime = new Date(request.created_at).getTime();
      const updatedTime = new Date(request.updated_at).getTime();
      TestValidator.predicate(
        `request ${request.id} timestamps are valid`,
        createdTime <= updatedTime,
      );
    },
  );
}
