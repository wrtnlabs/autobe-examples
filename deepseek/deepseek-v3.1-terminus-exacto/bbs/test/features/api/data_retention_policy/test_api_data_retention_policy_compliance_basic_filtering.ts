import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_data_retention_policy_compliance_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using SDK function (no utility function available)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authResult);
  // Perform basic search with minimal filters
  const response =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
      superAdminConnection,
      {
        body: {
          search: undefined,
          page: undefined,
          limit: undefined,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  // Validate data array structure
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  // Validate each policy summary structure
  for (const policy of response.data) {
    typia.assert(policy);
    TestValidator.predicate(
      "policy has valid UUID id",
      typeof policy.id === "string" && policy.id.length > 0,
    );
    TestValidator.predicate(
      "policy has non-empty name",
      typeof policy.policy_name === "string" && policy.policy_name.length > 0,
    );
    TestValidator.predicate(
      "policy has valid retention period",
      typeof policy.retention_period_days === "number" &&
        policy.retention_period_days >= 0,
    );
    TestValidator.predicate(
      "policy has valid retention action",
      typeof policy.retention_action === "string" &&
        policy.retention_action.length > 0,
    );
    TestValidator.predicate(
      "policy has valid active status",
      typeof policy.is_active === "boolean",
    );
  }
}
