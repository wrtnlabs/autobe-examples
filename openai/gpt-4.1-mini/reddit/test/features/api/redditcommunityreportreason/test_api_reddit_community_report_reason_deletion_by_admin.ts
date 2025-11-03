import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * This test validates the full lifecycle of a reddit community report reason
 * management by an admin user.
 *
 * The sequence includes:
 *
 * 1. Admin join to authenticate and obtain admin user context
 * 2. Creation of a unique report reason with relevant details
 * 3. Verification that the report reason was created correctly
 * 4. Deletion of the report reason using its reason code
 * 5. Confirmation that the report reason no longer exists (error expected upon
 *    retrieval)
 *
 * This tests authorization, creation, and deletion API operations.
 */
export async function test_api_reddit_community_report_reason_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join to authenticate
  // Create a new UUID for referencing user_id; we simulate as if the user exists already
  // Since we only have IRedditCommunityAdmin.ICreate with required user_id string (uuid format)
  // Use typia.random for UUID generation
  const user_id = typia.random<string & tags.Format<"uuid">>();

  // Create new admin user via join API
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { user_id } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a unique report reason
  // Create unique reason code and names
  const reasonCode = `testCode_${RandomGenerator.alphaNumeric(10)}`;
  const reasonName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 10,
  });
  const nowISOString = new Date().toISOString();

  const reportReasonCreateBody = {
    reason_code: reasonCode,
    reason_name: reasonName,
    description,
    created_at: nowISOString,
    updated_at: nowISOString,
  } satisfies IRedditCommunityReportReason.ICreate;

  const createdReportReason: IRedditCommunityReportReason =
    await api.functional.redditCommunity.admin.redditCommunityReportReasons.create(
      connection,
      {
        body: reportReasonCreateBody,
      },
    );
  typia.assert(createdReportReason);

  TestValidator.equals(
    "created reason is same code",
    createdReportReason.reason_code,
    reasonCode,
  );

  // 3. Delete the report reason by its reason code
  await api.functional.redditCommunity.admin.redditCommunityReportReasons.erase(
    connection,
    {
      reasonCode,
    },
  );

  // 4. Attempt to delete again should cause error since it does not exist
  await TestValidator.error(
    "deleting non-existent report reason should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityReportReasons.erase(
        connection,
        {
          reasonCode,
        },
      );
    },
  );
}
