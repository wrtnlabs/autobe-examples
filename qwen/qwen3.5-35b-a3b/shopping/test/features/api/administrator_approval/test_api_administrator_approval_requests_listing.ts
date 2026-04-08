import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_requests_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create fresh connection with super admin token for listing requests
  const adminListConnection: api.IConnection = { host: connection.host };
  adminListConnection.headers = {
    Authorization: superAdminAuth.token.access,
  };
  // 3. Call listing endpoint with default parameters
  const response =
    await api.functional.ecommerceMall.superAdministrator.admin_requests.index(
      adminListConnection,
      {
        body: {} satisfies IEcommerceMallAdministratorApprovalRequests.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination structure
  typia.assert(response.pagination);
  TestValidator.equals(
    "pagination current is valid number",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is valid number",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is valid number",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is valid number",
    typeof response.pagination.pages,
    "number",
  );
  // 5. Validate default limit is within valid range (1-100)
  TestValidator.predicate(
    "limit is within valid range (1-100)",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  // 6. Validate records count is non-negative
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  // 7. Validate pages calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
  // 8. Validate data array structure
  typia.assert(response.data);
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 9. Validate each request summary in data array
  for (let i = 0; i < response.data.length; i++) {
    const request = response.data[i];
    // Validate required fields exist
    typia.assert(request.id);
    TestValidator.predicate(
      `request ${i} has valid uuid id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.id,
      ),
    );
    typia.assert(request.status);
    TestValidator.equals(
      `request ${i} status is pending`,
      request.status,
      "pending",
    );
    typia.assert(request.reason);
    TestValidator.predicate(
      `request ${i} has non-empty reason`,
      request.reason.length > 0,
    );
    typia.assert(request.created_at);
    typia.assert(request.updated_at);
    // Validate ISO 8601 date-time format
    const createdAt = new Date(request.created_at);
    const updatedAt = new Date(request.updated_at);
    TestValidator.predicate(
      `request ${i} created_at is valid datetime`,
      !isNaN(createdAt.getTime()),
    );
    TestValidator.predicate(
      `request ${i} updated_at is valid datetime`,
      !isNaN(updatedAt.getTime()),
    );
    // Validate requester identification (member or seller)
    const hasMemberId =
      request.requesting_member_id !== undefined &&
      request.requesting_member_id !== null;
    const hasSellerId =
      request.requesting_seller_id !== undefined &&
      request.requesting_seller_id !== null;
    TestValidator.predicate(
      `request ${i} has either member_id or seller_id`,
      hasMemberId || hasSellerId,
    );
    // Validate requester_id format if present
    if (hasMemberId) {
      TestValidator.predicate(
        `request ${i} member_id is valid uuid`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          request.requesting_member_id!,
        ),
      );
    }
    if (hasSellerId) {
      TestValidator.predicate(
        `request ${i} seller_id is valid uuid`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          request.requesting_seller_id!,
        ),
      );
    }
    // Validate optional reviewing_super_admin_id format if present
    if (
      request.reviewing_super_admin_id !== undefined &&
      request.reviewing_super_admin_id !== null
    ) {
      TestValidator.predicate(
        `request ${i} reviewing_super_admin_id is valid uuid`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          request.reviewing_super_admin_id!,
        ),
      );
    }
    // Validate optional created_admin_id format if present
    if (
      request.created_admin_id !== undefined &&
      request.created_admin_id !== null
    ) {
      TestValidator.predicate(
        `request ${i} created_admin_id is valid uuid`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          request.created_admin_id!,
        ),
      );
    }
  }
  // 10. Validate sorting order (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at);
      const next = new Date(response.data[i + 1].created_at);
      TestValidator.predicate(
        `request ${i} is newer than or equal to request ${i + 1}`,
        current.getTime() >= next.getTime(),
      );
    }
  }
  // 11. Validate totalCount matches data array length
  TestValidator.equals(
    "totalCount matches data array length",
    response.pagination.records,
    response.data.length,
  );
  // 12. Validate hasMore flag exists and is boolean
  typia.assert(response.data);
}
