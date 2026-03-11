import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_data_retention_policies_search_by_entity_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // Update connection with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authResponse.token.access,
  };
  // Step 2: Execute search request filtering by target_entity_type='todo'
  const searchRequest = {
    target_entity_type: "todo",
    page: 1,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IMultiUserTodoDataRetentionPolicy.IRequest;
  const response =
    await api.functional.multiUserTodo.admin.data_retention_policies.index(
      adminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);
  // Step 3: Verify pagination metadata structure
  const pagination = response.pagination;
  TestValidator.equals(
    "current page matches request",
    pagination.current,
    searchRequest.page,
  );
  TestValidator.equals(
    "limit matches request",
    pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "records count non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count non-negative", pagination.pages >= 0);
  // Step 4: Validate that all returned policies match the filter criteria
  for (const policy of response.data) {
    typia.assert(policy);
    TestValidator.equals(
      "entity type matches filter",
      policy.target_entity_type,
      "todo",
    );
  }
  // Step 5: Verify pagination calculations
  if (response.data.length > 0) {
    TestValidator.predicate(
      "records count matches or exceeds data length",
      pagination.records >= response.data.length,
    );
    TestValidator.predicate(
      "pages calculation correct",
      pagination.pages === Math.ceil(pagination.records / pagination.limit),
    );
  }
  // Step 6: Test with default pagination parameters
  const defaultSearchRequest = {
    target_entity_type: "todo",
  } satisfies IMultiUserTodoDataRetentionPolicy.IRequest;
  const defaultResponse =
    await api.functional.multiUserTodo.admin.data_retention_policies.index(
      adminConnection,
      {
        body: defaultSearchRequest,
      },
    );
  typia.assert(defaultResponse);
  // Verify default pagination values
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit is positive",
    defaultResponse.pagination.limit > 0,
  );
}
