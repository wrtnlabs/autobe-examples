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

export async function test_api_administrator_seller_approval_pending_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create a new connection with admin token for subsequent calls
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // 2. Fetch pending seller approval requests with default pagination
  const response =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminAuthenticatedConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages correct",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate each record in the data array
  for (const record of response.data) {
    typia.assertGuard(record);
    // Verify record has required fields and status is pending
    TestValidator.equals("record status is pending", record.status, "pending");
    TestValidator.predicate(
      "record has created_at",
      record.created_at !== undefined,
    );
    TestValidator.predicate(
      "record has updated_at",
      record.updated_at !== undefined,
    );
    // Verify seller contains required fields
    TestValidator.predicate(
      "seller has display_name",
      record.seller.display_name.length > 0,
    );
    TestValidator.predicate(
      "seller has approval_status",
      record.seller.approval_status !== undefined,
    );
    TestValidator.predicate(
      "seller has created_at",
      record.seller.created_at !== undefined,
    );
    TestValidator.predicate(
      "seller is_suspended is boolean",
      typeof record.seller.is_suspended === "boolean",
    );
    // Verify email may be present for seller
    if (record.seller.email !== undefined) {
      TestValidator.predicate(
        "seller email is valid format",
        /\S+@\S+\.\S+/.test(record.seller.email),
      );
    }
    // Verify reviewer is null for pending requests
    TestValidator.equals(
      "reviewer is undefined for pending",
      record.reviewer,
      undefined,
    );
  }
  // 5. Verify sorting: records should be ordered by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at).getTime();
      const currDate = new Date(response.data[i].created_at).getTime();
      TestValidator.predicate(
        `record ${i} is older than record ${i - 1}`,
        currDate <= prevDate,
      );
    }
  }
}
