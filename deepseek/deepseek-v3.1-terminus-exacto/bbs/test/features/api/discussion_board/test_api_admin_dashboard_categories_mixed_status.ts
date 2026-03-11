import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_categories_mixed_status(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Call the dashboard categories endpoint
  const response =
    await api.functional.discussionBoard.admin.dashboard.categories.at(
      adminConnection,
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.predicate(
    "response should be valid section summary",
    typeof response.id === "string" &&
      typeof response.name === "string" &&
      typeof response.created_at === "string",
  );
  // Validate UUID format for id
  TestValidator.predicate(
    "id should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  // Validate date-time format for created_at
  TestValidator.predicate(
    "created_at should be valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/i.test(
      response.created_at,
    ),
  );
  // Validate description can be string or null
  TestValidator.predicate(
    "description should be string or null",
    response.description === null || typeof response.description === "string",
  );
}
