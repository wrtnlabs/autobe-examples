import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_activities_admin_basic_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using proper authorize_admin_join call
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Call system activities endpoint with default pagination
  const response =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          page: undefined,
          limit: undefined,
          start_date: undefined,
          end_date: undefined,
          activity_type: undefined,
          group_by: undefined,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata with specific constraints
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is between 1 and 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Validate individual activity summaries if any exist
  if (response.data.length > 0) {
    const activity = response.data[0];
    // Validate UUID format for id
    TestValidator.predicate(
      "activity id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        activity.id,
      ),
    );
    // Validate activity_type is non-empty string
    TestValidator.predicate(
      "activity_type is non-empty",
      typeof activity.activity_type === "string" &&
        activity.activity_type.length > 0,
    );
    // Validate actor_display_name is non-empty string
    TestValidator.predicate(
      "actor_display_name is non-empty",
      typeof activity.actor_display_name === "string" &&
        activity.actor_display_name.length > 0,
    );
    // Validate success_status is boolean
    TestValidator.equals(
      "success_status is boolean",
      typeof activity.success_status,
      "boolean",
    );
    // Validate created_at is ISO date string
    TestValidator.predicate(
      "created_at is valid ISO date",
      typeof activity.created_at === "string" &&
        !isNaN(Date.parse(activity.created_at)),
    );
    // Validate optional fields can be null
    if (activity.target_entity_type !== null) {
      TestValidator.predicate(
        "target_entity_type is string when not null",
        typeof activity.target_entity_type === "string",
      );
    }
    if (activity.target_entity_id !== null) {
      TestValidator.predicate(
        "target_entity_id is valid UUID when not null",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          activity.target_entity_id,
        ),
      );
    }
  }
}
