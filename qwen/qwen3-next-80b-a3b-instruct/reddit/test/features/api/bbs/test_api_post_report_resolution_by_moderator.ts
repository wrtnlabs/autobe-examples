import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_post_report_resolution_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate via join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Generate a random report ID to resolve (since no create endpoint is available)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Resolve the report with resolution details
  const resolutionNotes = RandomGenerator.paragraph({ sentences: 5 });
  const updatedReport =
    await api.functional.communityBbs.moderator.post_reports.update(
      moderatorConnection,
      {
        reportId: reportId,
        body: {
          resolution_notes: resolutionNotes,
          status: "resolved",
        } satisfies ICommunityBbsPostReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Step 4: Validate the resolution
  TestValidator.equals(
    "report status is resolved",
    updatedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution notes match",
    updatedReport.resolution_notes,
    resolutionNotes,
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    updatedReport.resolved_at !== null &&
      updatedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "resolved_by_id matches moderator",
    updatedReport.resolved_by_id,
    moderator.id,
  );
}
