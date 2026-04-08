import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_suspension_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - submit admin request first
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Login as admin using the authorized admin's email
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuthorized.email,
      password: "AdminPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Call the seller suspensions list endpoint with pagination
  const response =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata exists
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  // 5. Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 6. Validate each suspension record structure if data exists
  for (const suspension of response.data) {
    // Verify seller info exists
    TestValidator.equals(
      "seller id exists",
      suspension.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "seller email exists",
      suspension.seller?.email !== undefined,
      true,
    );
    // Verify suspension details
    TestValidator.equals(
      "reason exists",
      suspension.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "suspended_at exists",
      suspension.suspended_at !== undefined,
      true,
    );
    // Verify suspended_by admin info
    TestValidator.equals(
      "suspended_by admin exists",
      suspension.suspended_by !== undefined,
      true,
    );
    TestValidator.equals(
      "suspended_by admin id exists",
      suspension.suspended_by?.id !== undefined,
      true,
    );
    TestValidator.equals(
      "suspended_by admin email exists",
      suspension.suspended_by?.email !== undefined,
      true,
    );
    TestValidator.equals(
      "suspended_by admin name exists",
      suspension.suspended_by?.name !== undefined,
      true,
    );
    // Verify restored_at can be null or a date-time
    TestValidator.predicate(
      "restored_at is valid date-time or null",
      suspension.restored_at === null ||
        !isNaN(Date.parse(suspension.restored_at)),
    );
  }
  // 7. Validate ordering - suspended_at should be in descending order
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].suspended_at);
      const next = new Date(response.data[i + 1].suspended_at);
      TestValidator.predicate(
        `suspension at index ${i} is >= than index ${i + 1}`,
        current >= next,
      );
    }
  }
}