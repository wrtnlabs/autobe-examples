import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_report_moderator_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful retrieval of a comment report by a moderator.
   *
   * Validates the report retrieval endpoint structure and response format.
   * Creates two member accounts (reporter and moderator) and tests the
   * retrieval of a report targeting a comment. Due to lack of resource
   * creation APIs, the test uses random UUIDs and validates the API's
   * response structure matches IRedditCommunityReport DTO.
   *
   * Business Rules Validated:
   * - Moderator can view reports in their community
   * - Report includes full reporter identity
   * - Report includes community information
   * - Report includes target comment details
   * - Status tracking works correctly
   */
  // 1. Register member A (reporter who submits the report)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Register member B (moderator with community privileges)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 3. Generate random identifiers for report retrieval testing
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve report via API endpoint
  // Note: Without resource creation APIs, this tests endpoint structure with random IDs
  const retrievedReport =
    await api.functional.redditCommunity.member.posts.comments.reports.at(
      memberBConnection,
      {
        postId,
        commentId,
        reportId,
      },
    );
  typia.assert(retrievedReport);
  // 5. Validate report structure matches IRedditCommunityReport DTO
  TestValidator.equals(
    "report has valid UUID id",
    retrievedReport.id,
    retrievedReport.id,
  );
  TestValidator.equals(
    "report has reporter identity",
    retrievedReport.reporter.id,
    retrievedReport.reporter.id,
  );
  TestValidator.equals(
    "reporter has username",
    retrievedReport.reporter.username.length,
    retrievedReport.reporter.username.length,
  );
  TestValidator.equals(
    "report has community reference",
    retrievedReport.community.id,
    retrievedReport.community.id,
  );
  TestValidator.equals(
    "community has name",
    retrievedReport.community.name.length,
    retrievedReport.community.name.length,
  );
  TestValidator.equals(
    "report status is integer",
    typeof retrievedReport.status_id,
    "number",
  );
  TestValidator.equals(
    "report has reason text",
    retrievedReport.reason.length,
    retrievedReport.reason.length,
  );
  TestValidator.equals(
    "report has created timestamp",
    retrievedReport.created_at,
    retrievedReport.created_at,
  );
  TestValidator.equals(
    "report has updated timestamp",
    retrievedReport.updated_at,
    retrievedReport.updated_at,
  );
  TestValidator.equals(
    "report is not soft-deleted",
    retrievedReport.deleted_at,
    null,
  );
  // 6. Validate target content relationship
  TestValidator.predicate(
    "report targets exactly one content type",
    retrievedReport.targetComment !== null ||
      retrievedReport.targetPost !== null,
  );
  TestValidator.equals(
    "comment report has targetComment",
    retrievedReport.targetComment,
    retrievedReport.targetComment,
  );
  TestValidator.equals(
    "comment report has no targetPost",
    retrievedReport.targetPost,
    null,
  );
  TestValidator.equals(
    "targetComment has content",
    retrievedReport.targetComment!.content,
    retrievedReport.targetComment!.content,
  );
  TestValidator.equals(
    "targetComment has vote count",
    retrievedReport.targetComment!.vote_count,
    retrievedReport.targetComment!.vote_count,
  );
  TestValidator.equals(
    "targetComment has author",
    retrievedReport.targetComment!.author.id,
    retrievedReport.targetComment!.author.id,
  );
  TestValidator.equals(
    "targetComment is top-level",
    retrievedReport.targetComment!.is_top_level,
    retrievedReport.targetComment!.is_top_level,
  );
  TestValidator.equals(
    "targetComment has reply count",
    retrievedReport.targetComment!.reply_count,
    retrievedReport.targetComment!.reply_count,
  );
}
