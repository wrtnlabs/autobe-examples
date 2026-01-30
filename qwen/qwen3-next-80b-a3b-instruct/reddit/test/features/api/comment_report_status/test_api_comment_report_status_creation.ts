import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReportStatus";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { prepare_random_community_bbs_comment_report_status } from "../../../prepare/prepare_random_community_bbs_comment_report_status";
import { generate_random_community_bbs_moderator_comment_report_statuses_create } from "../../../generate/generate_random_community_bbs_moderator_comment_report_statuses_create";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_report_status_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  // Step 2: Create a new comment report status with valid parameters using business-appropriate values
  const createdStatus: ICommunityBbsCommentReportStatus =
    await api.functional.communityBbs.moderator.comment_report_statuses.create(
      moderatorConnection,
      {
        body: {
          status_name: "Under Investigation",
          description:
            "This report is currently under review by moderators and requires further investigation.",
          is_active: true,
        } satisfies ICommunityBbsCommentReportStatus.ICreate,
      },
    );
  // Step 3: Validate that the created status has all required fields with correct types
  typia.assert(createdStatus);
  // The typia.assert() covers all validation: UUID format, date-time format,
  // string lengths, boolean type, and all other constraints. No additional
  // validation is needed or allowed as per the strict no-type-error-testing policy.
}
