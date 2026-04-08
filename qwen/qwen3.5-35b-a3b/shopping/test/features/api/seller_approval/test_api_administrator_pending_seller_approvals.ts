import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_pending_seller_approvals(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234",
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // 2. Create new connection with admin token for subsequent calls
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminResult.token.access },
  };
  // 3. Test with default pagination parameters (no filters)
  const defaultResult =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminAuthConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResult);
  // 4. Validate default pagination structure
  TestValidator.equals(
    "default pagination current page",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "default pagination records >= 0",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages >= 0",
    defaultResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default data is array",
    Array.isArray(defaultResult.data),
  );
  // 5. Test with explicit pagination parameters
  const explicitResult =
    await api.functional.ecommerceMall.administrator.sellers.pending.index(
      adminAuthConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(explicitResult);
  // 6. Validate explicit pagination structure
  TestValidator.equals(
    "explicit pagination current page",
    explicitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit pagination limit",
    explicitResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "explicit pagination records >= 0",
    explicitResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "explicit pagination pages >= 0",
    explicitResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "explicit data is array",
    Array.isArray(explicitResult.data),
  );
  // 7. If records exist, validate each approval request structure
  if (explicitResult.data.length > 0) {
    for (const approvalRequest of explicitResult.data) {
      // Validate approval request status
      TestValidator.equals(
        "approval status is pending",
        approvalRequest.status,
        "pending",
      );
      // Validate seller reference object exists
      TestValidator.predicate(
        "seller reference exists",
        approvalRequest.seller !== null && approvalRequest.seller !== undefined,
      );
      // Validate seller has required fields
      TestValidator.predicate(
        "seller has id",
        approvalRequest.seller.id !== undefined,
      );
      TestValidator.predicate(
        "seller has display_name",
        approvalRequest.seller.display_name !== undefined,
      );
      TestValidator.predicate(
        "seller email is optional but valid if present",
        approvalRequest.seller.email === undefined ||
          /^[\w-\.]@([\w-]+\.)+[\w-]{2,4}$/.test(approvalRequest.seller.email),
      );
      // Validate timestamps
      TestValidator.predicate(
        "created_at is valid date-time",
        approvalRequest.created_at !== undefined,
      );
      TestValidator.predicate(
        "updated_at is valid date-time",
        approvalRequest.updated_at !== undefined,
      );
      // Validate approval request has required fields
      TestValidator.predicate(
        "approval request has id",
        approvalRequest.id !== undefined,
      );
    }
  }
}
