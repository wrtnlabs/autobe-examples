import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderation_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Use the moderator connection to retrieve a moderation report
  // We use a randomly generated UUID as the reportId since we don't have a creation endpoint
  // This assumes a report exists in the system for testing purposes
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.moderation.reports.at(
      moderatorConnection,
      {
        reportId,
      },
    );
  // Step 3: Validate the report response against the schema
  typia.assert(report);
  // Step 4: Confirm required fields are present and valid
  TestValidator.equals("report has valid UUID id", typeof report.id, "string");
  TestValidator.equals(
    "reporter_id has valid UUID format",
    typeof report.reporter_id,
    "string",
  );
  TestValidator.predicate(
    "target_comment_id is string or null",
    report.target_comment_id === null ||
      typeof report.target_comment_id === "string",
  );
  TestValidator.predicate(
    "id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      report.id,
    ),
  );
  TestValidator.predicate(
    "reporter_id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      report.reporter_id,
    ),
  );
}
