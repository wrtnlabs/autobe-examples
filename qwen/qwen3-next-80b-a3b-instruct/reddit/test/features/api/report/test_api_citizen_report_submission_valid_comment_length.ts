import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import type { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";

export async function test_api_citizen_report_submission_valid_comment_length(
  connection: api.IConnection,
) {
  // 1. Authenticate as citizen
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: `${citizenEmail}|password123!` satisfies ICommunityBBSCitizenICreate,
    });
  typia.assert(citizen);

  // 2. Create a post to report
  // ICommunityBBSPost.ICreate is defined as string in the DTO, so we need to construct a valid string representation
  // Based on the example usage and schema description, this likely represents a JSON stringified object
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.name();
  const postBody = RandomGenerator.paragraph({ sentences: 5 });
  const postJson = JSON.stringify({
    title: postTitle,
    body: postBody,
    community_id: communityId,
  });

  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: postJson satisfies ICommunityBBSPost.ICreate,
    });
  typia.assert(post);

  // 3. Submit a report with exactly 500-character comment
  // Generate exactly 500 characters using RandomGenerator.paragraph with precise control
  let comment = "";
  while (comment.length < 495) {
    comment +=
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 6 }) + " ";
  }
  // Trim to exact 500 characters if needed
  comment = comment.substring(0, 500);

  // Validate comment is exactly 500 characters
  TestValidator.equals("comment length is exactly 500", comment.length, 500);

  const report: ICommunityBBSReport =
    await api.functional.communityBBS.citizen.reports.create(connection, {
      body: {
        targeted_entity_type: "post",
        target_id: post.id,
        report_reason_id: typia.random<string & tags.Format<"uuid">>(),
        comment,
      } satisfies ICommunityBBSReport.ICreate,
    });
  typia.assert(report);

  // 4. Validate the returned report has the exact 500-character comment
  TestValidator.equals(
    "report comment matches submitted comment",
    report.comment,
    comment,
  );
}
