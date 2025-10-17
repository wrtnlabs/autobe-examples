import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

export async function test_api_admin_create_report_status(
  connection: api.IConnection,
) {
  // 1. Admin join
  // 2. Admin login
  // 3. Create new report status with unique name and optional description
  // 4. Validate the response object for correctness and schema compliance

  // 1. Admin join - register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123!";
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create new report status
  const uniqueName = `status-${RandomGenerator.alphaNumeric(8)}`;
  const statusDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const createdStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: {
          name: uniqueName,
          description: statusDescription,
        } satisfies IRedditCommunityReportStatus.ICreate,
      },
    );

  // 4. Validate response integrity
  typia.assert(createdStatus);

  TestValidator.equals(
    "report status name matches",
    createdStatus.name,
    uniqueName,
  );
  TestValidator.equals(
    "report status description matches",
    createdStatus.description,
    statusDescription,
  );

  // Validate id is a UUID format string
  TestValidator.predicate(
    "report status id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdStatus.id,
    ),
  );

  // Validate timestamps are ISO 8601 date-time strings
  TestValidator.predicate(
    "report status created_at is ISO date-time",
    typeof createdStatus.created_at === "string" &&
      !isNaN(Date.parse(createdStatus.created_at)),
  );

  TestValidator.predicate(
    "report status updated_at is ISO date-time",
    typeof createdStatus.updated_at === "string" &&
      !isNaN(Date.parse(createdStatus.updated_at)),
  );

  // Validate deleted_at is null or undefined
  TestValidator.predicate(
    "report status deleted_at is null or undefined",
    createdStatus.deleted_at === null || createdStatus.deleted_at === undefined,
  );
}
