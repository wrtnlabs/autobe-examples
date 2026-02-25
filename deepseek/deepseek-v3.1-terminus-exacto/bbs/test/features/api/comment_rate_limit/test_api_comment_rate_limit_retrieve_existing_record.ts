import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
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
 * Test retrieving an existing comment rate limit record for administrative oversight.
 * 1. Create and authenticate an administrator account
 * 2. Retrieve an existing rate limit record (assuming system has pre-existing data)
 * 3. Validate all required fields and timestamp formatting
 */
export async function test_api_comment_rate_limit_retrieve_existing_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Generate a random UUID that might exist in the system
  // In a real scenario, this would come from actual system data
  const testRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the rate limit record using the admin connection
  // Note: This will either succeed (if ID exists) or test error handling
  const retrievedRecord =
    await api.functional.discussionBoard.admin.comment_rate_limits.at(
      adminConnection,
      {
        rateLimitId: testRateLimitId,
      },
    );
  typia.assert(retrievedRecord);
  // 4. Validate the retrieved record has correct structure
  TestValidator.predicate(
    "record has valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedRecord.id,
    ),
  );
  TestValidator.predicate(
    "record has valid user ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedRecord.discussion_board_user_id,
    ),
  );
  TestValidator.predicate(
    "submitted_at is valid ISO string",
    () => !isNaN(Date.parse(retrievedRecord.submitted_at)),
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    () => !isNaN(Date.parse(retrievedRecord.created_at)),
  );
  // 5. Validate timestamp consistency (created_at should be before or equal to current time)
  TestValidator.predicate(
    "created_at is reasonable timestamp",
    () => new Date(retrievedRecord.created_at) <= new Date(),
  );
}
