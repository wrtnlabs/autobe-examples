import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_actions_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Verify admin was successfully authenticated
  typia.assert(authResult);
  // Call the moderation actions endpoint
  const result: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.admin.moderations.actions.index(
      adminConnection,
    );
  // Validate response structure
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 100); // Default maximum limit
  TestValidator.predicate(
    "pagination records >= 0",
    () => result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => result.pagination.pages >= 0,
  );
  // Validate array structure
  TestValidator.predicate("data is array", () => Array.isArray(result.data));
  // Validate each moderation action summary object
  for (const action of result.data) {
    TestValidator.equals("action id is UUID", typeof action.id, "string");
    TestValidator.predicate("action id matches UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        action.id,
      ),
    );
    TestValidator.equals(
      "action type is valid",
      typeof action.action,
      "string",
    );
    TestValidator.predicate("action type is one of permitted values", () =>
      [
        "remove_post",
        "remove_comment",
        "ban_user",
        "approve_report",
        "flag_content",
        "unban_user",
        "remove_content",
        "restore_content",
        "assign_moderator",
      ].includes(action.action),
    );
    TestValidator.equals(
      "target_id is UUID",
      typeof action.target_id,
      "string",
    );
    TestValidator.predicate("target_id matches UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        action.target_id,
      ),
    );
    TestValidator.equals(
      "target_type is valid",
      typeof action.target_type,
      "string",
    );
    TestValidator.predicate("target_type is one of permitted values", () =>
      ["post", "comment", "user"].includes(action.target_type),
    );
    TestValidator.equals(
      "moderator_id is UUID",
      typeof action.moderator_id,
      "string",
    );
    TestValidator.predicate("moderator_id matches UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        action.moderator_id,
      ),
    );
    TestValidator.equals("reason is string", typeof action.reason, "string");
    TestValidator.equals("status is valid", typeof action.status, "string");
    TestValidator.predicate("status is one of permitted values", () =>
      ["pending", "completed", "appealed", "reversed"].includes(action.status),
    );
    TestValidator.equals("severity is valid", typeof action.severity, "string");
    TestValidator.predicate("severity is one of permitted values", () =>
      ["low", "medium", "high", "critical"].includes(action.severity),
    );
    TestValidator.equals(
      "created_at is date-time string",
      typeof action.created_at,
      "string",
    );
    // Validate ISO 8601 date-time format (allows optional milliseconds and timezone offset)
    TestValidator.predicate("created_at matches ISO 8601 format", () =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        action.created_at,
      ),
    );
    // Validate optional properties according to DTO specification
    if (action.associated_report_id !== undefined) {
      TestValidator.equals(
        "associated_report_id is UUID",
        typeof action.associated_report_id,
        "string",
      );
      TestValidator.predicate("associated_report_id matches UUID format", () =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          (action.associated_report_id satisfies string | undefined as string),
        ),
      );
    }
    if (action.version !== undefined) {
      const version = typia.assert<number>(action.version);
      TestValidator.equals(
        "version is number",
        typeof version,
        "number",
      );
      TestValidator.predicate("version >= 0", () => version >= 0);
      TestValidator.predicate("version is integer", () =>
        Number.isInteger(version),
      );
    }
  }
}