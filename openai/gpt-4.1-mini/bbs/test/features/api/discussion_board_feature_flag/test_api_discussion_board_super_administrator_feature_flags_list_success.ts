import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { TestValidator } from "@nestia/e2e";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";

export async function test_api_discussion_board_super_administrator_feature_flags_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator (join)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Set the Authorization header for superAdminConnection
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = authorized.token.access;
  // 2. Request the feature flags list with pagination and filters
  const response =
    await api.functional.discussionBoard.superAdministrator.featureFlags.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate response structure: pagination and data
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination.current is number",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is number",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is number",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is number",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(data) &&
      data.every((item) => {
        try {
          typia.assert(item);
          return true;
        } catch {
          return false;
        }
      }),
  );
}