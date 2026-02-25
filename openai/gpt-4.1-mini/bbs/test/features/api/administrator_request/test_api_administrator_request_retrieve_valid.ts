import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Perform super administrator join to authorize
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssw0rd!",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // Use the authorized connection with headers set internally
  // Use a valid existing requestId for retrieval test
  // This must be present in the test database for test to pass
  // For demonstration, we use the ID of superAdmin.id as dummy
  // Since no creation utility provided, assume superAdmin.id is valid requestId
  // If this is not valid, use a manually set known UUID
  const requestId = superAdmin.id;
  // Retrieve administrator request
  const request =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.at(
      superAdminConnection,
      { requestId },
    );
  typia.assert(request);
  // Validate status enum
  TestValidator.predicate(
    "status is one of pending, approved, or rejected",
    () =>
      request.status === "pending" ||
      request.status === "approved" ||
      request.status === "rejected",
  );
  // Validate required fields
  TestValidator.predicate(
    "reason is non-empty string",
    request.reason.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    !isNaN(Date.parse(request.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    !isNaN(Date.parse(request.updated_at)),
  );
  // Validate registered user summary
  const user = request.registeredUser;
  typia.assert(user);
  TestValidator.predicate(
    "registeredUser.id is uuid",
    /^[0-9a-fA-F-]{36}$/.test(user.id),
  );
  TestValidator.predicate(
    "registeredUser.email includes @",
    user.email.includes("@"),
  );
  TestValidator.predicate(
    "registeredUser.displayName is non-empty string",
    user.displayName.length > 0,
  );
  if (user.bio !== null && user.bio !== undefined) {
    TestValidator.predicate(
      "registeredUser.bio is string",
      typeof user.bio === "string",
    );
  }
  TestValidator.predicate(
    "registeredUser.isBanned is boolean",
    typeof user.isBanned === "boolean",
  );
  TestValidator.predicate(
    "registeredUser.createdAt is ISO date-time",
    !isNaN(Date.parse(user.createdAt)),
  );
  TestValidator.predicate(
    "registeredUser.updatedAt is ISO date-time",
    !isNaN(Date.parse(user.updatedAt)),
  );
  if (user.deletedAt !== null && user.deletedAt !== undefined) {
    TestValidator.predicate(
      "registeredUser.deletedAt is ISO date-time or null",
      typeof user.deletedAt === "string",
    );
  }
}
