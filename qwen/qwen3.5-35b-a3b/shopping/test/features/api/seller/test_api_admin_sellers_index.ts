import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sellers_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Retrieve seller list with default pagination
  const sellersResponse =
    await api.functional.ecommerceMall.admin.sellers.index(
      adminAuthorizedConnection,
      { body: {} satisfies IEcommerceMallSeller.IRequest },
    );
  typia.assert(sellersResponse);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is non-negative",
    sellersResponse.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    sellersResponse.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    sellersResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    sellersResponse.pagination.pages >= 0,
    true,
  );
  // 5. Validate pagination calculation consistency
  const expectedPages =
    sellersResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          sellersResponse.pagination.records / sellersResponse.pagination.limit,
        );
  TestValidator.equals(
    "total pages calculation",
    sellersResponse.pagination.pages,
    expectedPages,
  );
  // 6. Validate seller data array structure
  TestValidator.equals(
    "data is an array",
    Array.isArray(sellersResponse.data),
    true,
  );
  // 7. Validate each seller has correct structure
  for (const seller of sellersResponse.data) {
    // Validate UUID format for seller id
    TestValidator.predicate("seller id is valid uuid", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seller.id,
      ),
    );
    // Validate email is non-empty string
    TestValidator.predicate(
      "seller email is non-empty",
      () => seller.email.length > 0,
    );
    // Validate status is one of the approved enum values
    TestValidator.predicate(
      "seller status is valid",
      () =>
        seller.status === "pending" ||
        seller.status === "approved" ||
        seller.status === "rejected",
    );
    // Validate createdAt is valid date-time format
    TestValidator.predicate(
      "seller createdAt is valid date-time",
      () => !Number.isNaN(Date.parse(seller.createdAt)),
    );
    // Validate updatedAt is valid date-time format
    TestValidator.predicate(
      "seller updatedAt is valid date-time",
      () => !Number.isNaN(Date.parse(seller.updatedAt)),
    );
    // Ensure password_hash is NOT present (security check)
    const hasPasswordHash = "password_hash" in seller;
    TestValidator.equals(
      "password_hash should not be present",
      hasPasswordHash,
      false,
    );
  }
}
