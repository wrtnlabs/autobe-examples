import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrative_history_filtered_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Define valid action types from the schema
  const validActionTypes = [
    "role_promotion",
    "user_ban",
    "request_approval",
    "request_rejection",
    "user_unban",
    "role_demotion",
    "status_change",
  ] as const;
  // Test filtering by each valid action type
  for (const actionType of validActionTypes) {
    const filteredHistory =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
        superAdminConnection,
        {
          body: {
            action_type: actionType satisfies string | null,
            page: 1 satisfies number,
            limit: 10 satisfies number,
          } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
        },
      );
    typia.assert(filteredHistory);
    // Validate pagination structure
    TestValidator.predicate(
      `${actionType} history returns valid pagination`,
      filteredHistory.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${actionType} history has valid page count`,
      filteredHistory.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${actionType} history has valid limit`,
      filteredHistory.pagination.limit === 10,
    );
    // Validate that all returned records match the filtered action type
    if (filteredHistory.data.length > 0) {
      TestValidator.predicate(
        `${actionType} records have correct action type`,
        filteredHistory.data.every(
          (record) => record.action_type === actionType,
        ),
      );
      // Validate chronological ordering (newest first)
      for (let i = 1; i < filteredHistory.data.length; i++) {
        const current = new Date(filteredHistory.data[i].created_at);
        const previous = new Date(filteredHistory.data[i - 1].created_at);
        TestValidator.predicate(
          `${actionType} records are in chronological order`,
          current <= previous,
        ); // Assuming descending order (newest first)
      }
      // Validate record structure
      filteredHistory.data.forEach((record) => {
        TestValidator.predicate(
          `${actionType} record has UUID id`,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            record.id,
          ),
        );
        TestValidator.predicate(
          `${actionType} record has valid target type`,
          typeof record.target_type === "string" &&
            record.target_type.length > 0,
        );
        TestValidator.predicate(
          `${actionType} record has UUID target_id`,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            record.target_id,
          ),
        );
        TestValidator.predicate(
          `${actionType} record has valid timestamp`,
          !isNaN(new Date(record.created_at).getTime()),
        );
      });
    } else {
      // Handle empty result scenario
      TestValidator.equals(
        `${actionType} history has no records`,
        filteredHistory.data.length,
        0,
      );
      TestValidator.predicate(
        `${actionType} history pagination reflects empty result`,
        filteredHistory.pagination.records === 0,
      );
    }
  }
}
