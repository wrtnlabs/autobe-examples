import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_settings_retrieval_pagination_authorization(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Create super administrator connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {}, // Empty body as per IJoin type
  });
  typia.assert(auth);
  // Set authorization header using obtained token
  superAdminConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // Call systemSettings.index with empty request (default parameters)
  const response =
    await api.functional.discussionBoard.superAdministrator.systemSettings.index(
      superAdminConnection,
      {
        body: {}, // empty request, retrieving all with pagination defaults
      },
    );
  typia.assert(response);
  // Validate pagination metadata correctness
  const { pagination, data } = response;
  typia.assert(pagination);
  TestValidator.predicate("pagination current >= 1", pagination.current >= 1);
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // Additional logical validation: records >= data.length
  TestValidator.predicate(
    "records >= data.length",
    pagination.records >= data.length,
  );
  // Validate each system setting has required properties: key, value, description, timestamps
  for (const setting of data) {
    // Since the IDiscussionBoardSystemSetting.ISummary schema is empty in provided DTO, we validate for existence
    // The exercise specifies key, value, description, timestamps, so we check their existence as best-effort
    TestValidator.predicate(
      "setting has key",
      typeof (setting as any).key === "string",
    );
    TestValidator.predicate(
      "setting has value",
      (setting as any).value !== undefined,
    );
    TestValidator.predicate(
      "setting has description",
      typeof (setting as any).description === "string" ||
        (setting as any).description === null,
    );
    TestValidator.predicate(
      "setting has created_at timestamp",
      typeof (setting as any).created_at === "string",
    );
    TestValidator.predicate(
      "setting has updated_at timestamp",
      typeof (setting as any).updated_at === "string",
    );
  }
  // Authorization check: try to call without token and expect failure
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.superAdministrator.systemSettings.index(
      unauthConnection,
      { body: {} },
    );
  });
}
