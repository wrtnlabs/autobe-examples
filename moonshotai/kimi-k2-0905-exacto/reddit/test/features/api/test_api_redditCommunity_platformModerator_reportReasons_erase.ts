import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_redditCommunity_platformModerator_reportReasons_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.platformModerator.reportReasons.erase(
      connection,
      {
        reportReasonCode: typia.random<string>(),
      },
    );
  typia.assert(output);
}
