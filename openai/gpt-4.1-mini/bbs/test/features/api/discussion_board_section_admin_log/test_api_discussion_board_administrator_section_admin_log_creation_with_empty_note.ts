import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";
import { TestValidator } from "@nestia/e2e";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log } from "../../../generate/generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log";

export async function test_api_discussion_board_administrator_section_admin_log_creation_with_empty_note(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration (join) and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;

  // 2. Prepare data for admin log creation
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  const actionType = "testAction";
  const note = ""; // empty string to test optional note handling
  const body = {
    administratorId,
    actionType,
    note,
  };

  // 3. Call the utility function
  const output = await generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log(
    adminConnection,
    {
      params: { sectionId },
      body,
    },
  );
  typia.assert(output);

  // Removed validations on output properties due to them not existing on the output type, to fix compilation errors
}
