import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

export async function test_api_admin_request_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create multiple customer accounts (each can have 1 pending request)
  // and create admin promotion requests from each
  const requestCount = 30;
  const createdRequests: IShoppingMallAdminRequest[] = [];
  for (let i = 0; i < requestCount; i++) {
    // Create unique customer for each request
    const customerConnection: api.IConnection = { host: connection.host };
    const customerJoin = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customerJoin);
    // Create admin request from this customer
    const request =
      await generate_random_shopping_mall_customer_admin_requests_create(
        customerConnection,
        {
          body: {
            reason: `Admin request #${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IShoppingMallAdminRequest.ICreate,
        },
      );
    typia.assert(request);
    createdRequests.push(request);
  }
  // 3. Test pagination with page=1, limit=10 (first page)
  const page1Response =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals("page 1 has 10 items", page1Response.data.length, 10);
  TestValidator.equals(
    "pagination current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Response.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    page1Response.pagination.records,
    requestCount,
  );
  TestValidator.equals(
    "pagination total pages",
    page1Response.pagination.pages,
    3,
  );
  // 4. Test pagination with page=2, limit=10 (second page)
  const page2Response =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 has 10 items", page2Response.data.length, 10);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // Verify page 1 and page 2 have different requests (no duplicates)
  const page1Ids = page1Response.data.map((r) => r.id);
  const page2Ids = page2Response.data.map((r) => r.id);
  const hasDuplicates = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("page 1 and 2 have no duplicates", !hasDuplicates);
  // 5. Test page=3 (last page with remaining items)
  const page3Response =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 3,
          limit: 10,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(page3Response);
  TestValidator.equals("page 3 has 10 items", page3Response.data.length, 10);
  TestValidator.equals(
    "page 3 current page",
    page3Response.pagination.current,
    3,
  );
  // 6. Verify all pages together contain all 30 requests
  const allIds = [
    ...page1Ids,
    ...page2Ids,
    ...page3Response.data.map((r) => r.id),
  ];
  TestValidator.equals(
    "total requests across pages",
    allIds.length,
    requestCount,
  );
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "all request IDs are unique",
    uniqueIds.size,
    requestCount,
  );
  // 7. Test with limit=50 (maximum allowed)
  const maxLimitResponse =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit returns all 30 items",
    maxLimitResponse.data.length,
    requestCount,
  );
  TestValidator.equals(
    "max limit pagination pages",
    maxLimitResponse.pagination.pages,
    1,
  );
  // 8. Test sorting by requested_at ascending (oldest first)
  const ascResponse =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 30,
          sort: "requested_at",
          direction: "asc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(ascResponse);
  // Verify ascending order (oldest first)
  for (let i = 0; i < ascResponse.data.length - 1; i++) {
    const currentTime = new Date(ascResponse.data[i].requested_at).getTime();
    const nextTime = new Date(ascResponse.data[i + 1].requested_at).getTime();
    TestValidator.predicate(
      `ascending order at index ${i}`,
      currentTime <= nextTime,
    );
  }
  // 9. Test sorting by requested_at descending (newest first)
  const descResponse =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 30,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(descResponse);
  // Verify descending order (newest first)
  for (let i = 0; i < descResponse.data.length - 1; i++) {
    const currentTime = new Date(descResponse.data[i].requested_at).getTime();
    const nextTime = new Date(descResponse.data[i + 1].requested_at).getTime();
    TestValidator.predicate(
      `descending order at index ${i}`,
      currentTime >= nextTime,
    );
  }
  // 10. Test sorting by status ascending (alphabetical: APPROVED, PENDING, REJECTED)
  const statusAscResponse =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 30,
          sort: "status",
          direction: "asc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(statusAscResponse);
  // Verify status ascending order
  for (let i = 0; i < statusAscResponse.data.length - 1; i++) {
    TestValidator.predicate(
      `status ascending at index ${i}`,
      statusAscResponse.data[i].status <= statusAscResponse.data[i + 1].status,
    );
  }
  // 11. Test combining status filter with pagination
  const filteredResponse =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "PENDING",
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // All returned requests should have status PENDING
  for (const request of filteredResponse.data) {
    TestValidator.equals(
      "filtered by PENDING status",
      request.status,
      "PENDING",
    );
  }
  // 12. Test edge case: page number beyond total pages returns empty data
  const beyondPageResponse =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 100,
          limit: 10,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond last page returns empty array",
    beyondPageResponse.data.length,
    0,
  );
  // 13. Test edge case: limit=1 returns single request per page
  const limit1Page1 =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(limit1Page1);
  TestValidator.equals("limit=1 returns 1 item", limit1Page1.data.length, 1);
  TestValidator.equals(
    "limit=1 pagination limit",
    limit1Page1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "limit=1 pagination pages",
    limit1Page1.pagination.pages,
    requestCount,
  );
  const limit1Page2 =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          page: 2,
          limit: 1,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(limit1Page2);
  TestValidator.equals(
    "limit=1 page 2 returns 1 item",
    limit1Page2.data.length,
    1,
  );
  TestValidator.notEquals(
    "limit=1 page 1 and 2 are different",
    limit1Page1.data[0].id,
    limit1Page2.data[0].id,
  );
}
