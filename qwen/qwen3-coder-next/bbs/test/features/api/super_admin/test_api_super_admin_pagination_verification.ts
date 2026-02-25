import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_pagination_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate super admin
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: superAdminData,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Create new connection with the token from registration
  const authenticatedConnection: api.IConnection = {
    host: superAdminConnection.host,
    headers: {
      Authorization: authorizedSuperAdmin.token.access,
    },
  };
  // Test pagination with page=1, limit=10
  const paginationRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuperAdmin.IRequest;
  const response =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      authenticatedConnection,
      { body: paginationRequest },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate each super admin summary has correct structure
  TestValidator.predicate(
    "data array has correct length",
    response.data.length >= 0,
  );
  response.data.forEach((superAdmin, index) => {
    typia.assert(superAdmin);
    TestValidator.equals(
      `super admin ${index} has valid UUID`,
      /^[0-9a-f-]{36}$/i.test(superAdmin.id),
      true,
    );
    TestValidator.equals(
      `super admin ${index} has email`,
      typeof superAdmin.email,
      "string",
    );
    TestValidator.equals(
      `super admin ${index} has created_at format`,
      typeof superAdmin.created_at,
      "string",
    );
  });
}
