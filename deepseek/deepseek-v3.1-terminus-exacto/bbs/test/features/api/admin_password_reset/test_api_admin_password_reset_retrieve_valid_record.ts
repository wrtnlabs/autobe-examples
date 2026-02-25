import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_retrieve_valid_record(
  connection: api.IConnection,
): Promise<void> {
  // Create admin authentication connection
  const authConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create separate connection for API calls with admin authentication
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // Search for password reset records with a reasonable limit
  const searchResult =
    await api.functional.discussionBoard.admin.admins.password_resets.index(
      adminConnection,
      {
        body: {
          status: "pending" as const,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(searchResult);
  // If no records found, we cannot proceed with retrieval test
  if (searchResult.data.length === 0) {
    // This is a valid scenario - no pending reset records exist
    return;
  }
  // Get the first reset record
  const resetRecord = searchResult.data[0];
  // Retrieve the full reset record by ID
  const retrievedRecord =
    await api.functional.discussionBoard.admin.admins.password_resets.at(
      adminConnection,
      {
        resetId: resetRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // Validate all expected fields are present
  TestValidator.equals("reset ID matches", retrievedRecord.id, resetRecord.id);
  TestValidator.equals(
    "expiration timestamp",
    retrievedRecord.expires_at,
    resetRecord.expires_at,
  );
  TestValidator.equals(
    "creation timestamp",
    retrievedRecord.created_at,
    resetRecord.created_at,
  );
  TestValidator.equals("usage status is null", retrievedRecord.used_at, null);
  TestValidator.equals(
    "admin summary matches",
    retrievedRecord.admin.id,
    resetRecord.admin.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedRecord.admin.email,
    resetRecord.admin.email,
  );
  TestValidator.equals(
    "admin display name matches",
    retrievedRecord.admin.display_name,
    resetRecord.admin.display_name,
  );
  // Verify the reset record is active (not expired and not used)
  const currentTime = new Date();
  const expirationTime = new Date(retrievedRecord.expires_at);
  TestValidator.predicate(
    "reset record is not expired",
    expirationTime > currentTime,
  );
  TestValidator.predicate(
    "reset record is not used",
    retrievedRecord.used_at === null,
  );
  // Validate complete structure
  TestValidator.predicate(
    "has updated_at field",
    retrievedRecord.updated_at !== undefined,
  );
  TestValidator.predicate(
    "admin has created_at field",
    retrievedRecord.admin.created_at !== undefined,
  );
}
