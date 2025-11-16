import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

export async function test_api_redditCommunity_platformModerator_reports_system_configuration_summary_systemConfigurationSummary(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.platformModerator.reports.system_configuration_summary.systemConfigurationSummary(
      connection,
    );
  typia.assert(output);
}
