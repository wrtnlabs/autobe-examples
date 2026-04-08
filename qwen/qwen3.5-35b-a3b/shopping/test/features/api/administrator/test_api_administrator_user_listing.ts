import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. List all users with default pagination
  const listConnection: api.IConnection = { host: connection.host };
  const listResponse =
    await api.functional.ecommerceMall.administrator.users.index(
      listConnection,
      {
        body: {
          pagination: {
            current: 1,
            limit: 20,
            records: 0,
            pages: 0,
          },
          data: [],
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(listResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    listResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is positive number",
    listResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive number",
    listResponse.pagination.pages > 0,
  );
  // 4. Validate at least one user exists
  TestValidator.predicate(
    "has at least one user record",
    listResponse.data.length >= 1,
  );
  // 5. Validate each user record has valid field types
  for (const [index, user] of listResponse.data.entries()) {
    TestValidator.predicate(
      `user ${index} type discriminator is valid`,
      user.type === "customer" ||
        user.type === "seller" ||
        user.type === "administrator",
    );
    TestValidator.predicate(
      `user ${index} display_name is string or null`,
      user.display_name === null || typeof user.display_name === "string",
    );
    TestValidator.predicate(
      `user ${index} approval_status is string or null`,
      user.approval_status === null || typeof user.approval_status === "string",
    );
    TestValidator.predicate(
      `user ${index} grade is string or null`,
      user.grade === null || typeof user.grade === "string",
    );
    TestValidator.predicate(
      `user ${index} is_banned is boolean or null`,
      user.is_banned === null || typeof user.is_banned === "boolean",
    );
    TestValidator.predicate(
      `user ${index} is_suspended is boolean or null`,
      user.is_suspended === null || typeof user.is_suspended === "boolean",
    );
    TestValidator.predicate(
      `user ${index} created_at is valid ISO date`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(user.created_at),
    );
    TestValidator.predicate(
      `user ${index} updated_at is valid ISO date`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(user.updated_at),
    );
  }
  // 6. Verify at least one customer exists in results
  const hasCustomer = listResponse.data.some(
    (user) => user.type === "customer",
  );
  TestValidator.predicate("has at least one customer", hasCustomer);
  // 7. Verify field nullability based on user type
  for (const user of listResponse.data) {
    if (user.type === "customer") {
      TestValidator.equals(
        "customer type has null approval_status",
        user.approval_status,
        null,
      );
      TestValidator.equals("customer type has null grade", user.grade, null);
      TestValidator.equals(
        "customer type has null is_suspended",
        user.is_suspended,
        null,
      );
    } else if (user.type === "seller") {
      TestValidator.equals("seller type has null grade", user.grade, null);
    } else if (user.type === "administrator") {
      TestValidator.equals(
        "administrator type has null approval_status",
        user.approval_status,
        null,
      );
      TestValidator.equals(
        "administrator type has null is_suspended",
        user.is_suspended,
        null,
      );
    }
  }
}
