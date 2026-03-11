import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the seller password reset request listing endpoint as an administrator.
 * Validates pagination, filtering by actorType, and response structure.
 */
export async function test_api_seller_password_resets_admin_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Call password resets list endpoint with seller filter
  const response =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "seller",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
          sortOrder: "desc",
          sort: "createdAt",
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current exists",
    response.pagination.current,
    null as any,
  );
  TestValidator.equals(
    "pagination limit exists",
    response.pagination.limit,
    null as any,
  );
  TestValidator.equals(
    "pagination records exists",
    response.pagination.records,
    null as any,
  );
  TestValidator.equals(
    "pagination pages exists",
    response.pagination.pages,
    null as any,
  );
  // 4. Validate pagination values are non-negative
  TestValidator.predicate(
    "pagination current is valid",
    () => response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    () => response.pagination.pages >= 0,
  );
  // 5. Validate data is array
  TestValidator.predicate("data is array", () => Array.isArray(response.data));
  // 6. Validate each record structure
  for (const record of response.data) {
    typia.assert(record);
    // Validate id is UUID
    TestValidator.predicate("record id is valid UUID", () =>
      /^[0-9a-f-]{36}$/i.test(record.id),
    );
    // Validate email is valid email format
    TestValidator.predicate("record email is valid email", () =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email),
    );
    // Validate timestamps are valid date-time
    TestValidator.predicate(
      "record expired_at is valid date-time",
      () => !isNaN(Date.parse(record.expired_at)),
    );
    TestValidator.predicate(
      "record created_at is valid date-time",
      () => !isNaN(Date.parse(record.created_at)),
    );
  }
  // 7. Verify sorting is descending by created_at (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const prevDate = new Date(response.data[i].created_at);
      const nextDate = new Date(response.data[i + 1].created_at);
      TestValidator.predicate(
        "records are sorted descending by created_at",
        () => prevDate.getTime() >= nextDate.getTime(),
      );
    }
  }
}