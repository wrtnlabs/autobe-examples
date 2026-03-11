import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_requests_index_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection using token
  const adminConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Test basic index call with no filters
  const basicRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnectionWithToken,
      {
        body: {},
      },
    );
  typia.assert(basicRequests);
  // 4. Validate response structure
  TestValidator.equals(
    "has pagination info",
    basicRequests.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(basicRequests.data),
    true,
  );
  // 5. Test filtering by request_status
  const pendingRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnectionWithToken,
      {
        body: {
          request_status: ["pending"],
        },
      },
    );
  typia.assert(pendingRequests);
  // 6. Test filtering by requester_type
  const customerRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnectionWithToken,
      {
        body: {
          requester_type: ["customer"],
        },
      },
    );
  typia.assert(customerRequests);
  // 7. Test filtering by date range
  const now = new Date();
  const fromMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toMonth = new Date(now.getTime());
  const dateRangeRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnectionWithToken,
      {
        body: {
          from_date: fromMonth.toISOString(),
          to_date: toMonth.toISOString(),
        },
      },
    );
  typia.assert(dateRangeRequests);
  // 8. Test pagination
  const paginatedRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnectionWithToken,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedRequests);
  // 9. Test sorting
  const sortedRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnectionWithToken,
      {
        body: {
          sort_by: "created_at",
          sort_order: "descending",
        },
      },
    );
  typia.assert(sortedRequests);
  // 10. Validate data structure if requests exist
  if (basicRequests.data.length > 0) {
    const firstRequest = basicRequests.data[0];
    // Validate required fields
    TestValidator.equals("has request id", firstRequest.id !== undefined, true);
    TestValidator.equals(
      "has reason",
      typeof firstRequest.reason === "string",
      true,
    );
    TestValidator.equals(
      "has request_status",
      ["pending", "approved", "rejected"].includes(firstRequest.request_status),
      true,
    );
    TestValidator.equals(
      "has customer or seller",
      firstRequest.customer !== undefined || firstRequest.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "has created_at",
      typeof firstRequest.created_at === "string",
      true,
    );
    TestValidator.equals(
      "has updated_at",
      typeof firstRequest.updated_at === "string",
      true,
    );
  }
}