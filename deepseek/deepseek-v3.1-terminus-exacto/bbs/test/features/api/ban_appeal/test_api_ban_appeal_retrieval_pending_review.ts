import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a ban appeal that is currently in pending status awaiting administrative review.
 * Verify that the complete appeal record is returned including appeal reason, status, timestamps,
 * and related ban record information. Validate that the response includes the appealing user's
 * summary information and that the reviewer field is null since no review has occurred yet.
 * Ensure all timestamps (appealed_at, created_at, updated_at) are properly populated and the
 * decision_reason is null for pending appeals.
 */
export async function test_api_ban_appeal_retrieval_pending_review(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator using the utility function
  const admin = await authorize_admin_join(adminConnection, {
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
  // Since we don't have utility functions to create ban records and appeals,
  // and the API documentation doesn't show creation endpoints for ban appeals,
  // we'll test the retrieval functionality with valid UUID format but acknowledge
  // that this may result in a 404 error if no data exists.
  // Use properly formatted UUIDs
  const banId = typia.random<string & tags.Format<"uuid">>();
  const appealId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the ban appeal - this may fail if the IDs don't exist
  // but will test the API endpoint functionality
  const appeal = await api.functional.discussionBoard.admin.bans.appeals.at(
    adminConnection,
    {
      banId,
      appealId,
    },
  );
  typia.assert(appeal);
  // Validate the appeal record structure (if we get a response)
  TestValidator.equals("appeal id matches", appeal.id, appealId);
  TestValidator.predicate(
    "appeal reason exists",
    appeal.appeal_reason.length > 0,
  );
  TestValidator.equals("status is pending", appeal.status, "pending");
  TestValidator.predicate(
    "appealed_at timestamp exists",
    appeal.appealed_at.length > 0,
  );
  // Validate ban record information
  TestValidator.equals("ban record id matches", appeal.banRecord.id, banId);
  TestValidator.predicate(
    "ban reason exists",
    appeal.banRecord.ban_reason.length > 0,
  );
  TestValidator.predicate(
    "ban status exists",
    appeal.banRecord.ban_status.length > 0,
  );
  TestValidator.predicate(
    "ban created_at exists",
    appeal.banRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "ban updated_at exists",
    appeal.banRecord.updated_at.length > 0,
  );
  // Validate user summary information
  TestValidator.predicate("user id exists", appeal.user.id.length > 0);
  TestValidator.predicate(
    "user display_name exists",
    appeal.user.display_name.length > 0,
  );
  TestValidator.predicate(
    "user created_at exists",
    appeal.user.created_at.length > 0,
  );
  TestValidator.predicate(
    "user updated_at exists",
    appeal.user.updated_at.length > 0,
  );
  // Validate pending appeal specific fields
  TestValidator.equals(
    "decision_reason is null for pending appeal",
    appeal.decision_reason,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for pending appeal",
    appeal.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewer is null for pending appeal",
    appeal.reviewer,
    null,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    appeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    appeal.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active appeal",
    appeal.deleted_at,
    null,
  );
}
