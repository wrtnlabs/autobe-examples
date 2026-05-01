import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_hub_report } from "../prepare/prepare_random_community_hub_report";

/**
 * Generate a random community hub report via the API for E2E testing.
 *
 * Prepares random report data using the prepare function, then calls the report
 * creation endpoint. The report targets either a post or comment with a randomly
 * generated UUID and reason text. The resulting report enters the moderation
 * workflow in a pending state, scoped to the community where the flagged content
 * resides.
 *
 * All report properties can be overridden through the DeepPartial input
 * parameter, allowing test callers to specify exact target_type, target_id, or
 * reason values for specific test scenarios such as reporting a known post,
 * testing duplicate reports, or validating reason length constraints.
 */
export async function generate_random_community_hub_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubReport.ICreate>;
  },
): Promise<ICommunityHubReport> {
  const prepared: ICommunityHubReport.ICreate =
    prepare_random_community_hub_report(props.body);
  const result: ICommunityHubReport =
    await api.functional.communityHub.member.reports.create(connection, {
      body: prepared,
    });
  return result;
}
