import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_user_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: "Admin123!@#",
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(superAdmin);
  // 2. List all users with super administrator credentials
  const userList =
    await api.functional.ecommerceMall.superAdministrator.users.index(
      adminConnection,
      {
        body: typia.random<IPageIEcommerceMallUser.IRequest>(),
      },
    );
  typia.assert(userList);
  // 3. Validate response structure
  TestValidator.equals("has pagination", userList.pagination.current, 1);
  TestValidator.equals("pagination limit", userList.pagination.limit, 20);
  TestValidator.predicate("has records", userList.pagination.records >= 1);
  TestValidator.predicate("has pages", userList.pagination.pages >= 1);
  TestValidator.predicate("data array exists", userList.data.length >= 1);
  // 4. Validate pagination metadata
  const expectedPages = Math.ceil(
    userList.pagination.records / userList.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages match",
    userList.pagination.pages,
    expectedPages,
  );
  // 5. Validate each user record
  for (const user of userList.data) {
    typia.assert(user);
    // Validate ID format (UUID)
    TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/i.test(user.id));
    // Validate type discriminator
    TestValidator.predicate(
      "has valid type",
      ["customer", "seller", "administrator"].includes(user.type),
    );
    // Validate email format (should be masked or full email)
    TestValidator.predicate(
      "email format valid",
      /^[a-zA-Z0-9._%+-]+@.+\.[a-zA-Z]{2,}$/.test(user.email) ||
        /^[a-zA-Z0-9]\*\*\*\.[a-zA-Z0-9._%+-]+$/.test(user.email),
    );
    // Validate display_name based on user type
    if (user.type === "customer") {
      TestValidator.predicate(
        "customer display_name can be null or string",
        user.display_name === null || typeof user.display_name === "string",
      );
    } else {
      TestValidator.predicate(
        "seller/admin display_name is string",
        typeof user.display_name === "string",
      );
    }
    // Validate type-specific fields
    if (user.type === "customer") {
      TestValidator.equals(
        "customer approval_status is null",
        user.approval_status,
        null,
      );
      TestValidator.equals("customer grade is null", user.grade, null);
      TestValidator.predicate(
        "customer is_banned can be boolean or null",
        user.is_banned === null || typeof user.is_banned === "boolean",
      );
      TestValidator.equals(
        "customer is_suspended is null",
        user.is_suspended,
        null,
      );
    } else if (user.type === "seller") {
      TestValidator.predicate(
        "seller approval_status has valid value",
        user.approval_status === null ||
          ["pending", "approved", "rejected"].includes(user.approval_status),
      );
      TestValidator.equals("seller grade is null", user.grade, null);
      TestValidator.equals("seller is_banned is null", user.is_banned, null);
      TestValidator.predicate(
        "seller is_suspended can be boolean or null",
        user.is_suspended === null || typeof user.is_suspended === "boolean",
      );
    } else if (user.type === "administrator") {
      TestValidator.equals(
        "admin approval_status is null",
        user.approval_status,
        null,
      );
      TestValidator.predicate(
        "admin grade has valid value",
        user.grade === null || ["regular", "super"].includes(user.grade),
      );
      TestValidator.predicate(
        "admin is_banned can be boolean or null",
        user.is_banned === null || typeof user.is_banned === "boolean",
      );
      TestValidator.equals(
        "admin is_suspended is null",
        user.is_suspended,
        null,
      );
    }
    // Validate timestamp formats
    TestValidator.predicate(
      "created_at is valid datetime",
      !isNaN(Date.parse(user.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid datetime",
      !isNaN(Date.parse(user.updated_at)),
    );
  }
  // 6. Validate that data length matches pagination
  TestValidator.predicate(
    "data length within limit",
    userList.data.length <= userList.pagination.limit,
  );
}
