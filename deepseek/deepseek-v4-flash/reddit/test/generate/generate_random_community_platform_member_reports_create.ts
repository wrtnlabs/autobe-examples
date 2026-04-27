import api from "@ORGANIZATION/PROJECT-api";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_community_platform_report } from "../prepare/prepare_random_community_platform_report";

/**
 * Generate a random community platform member report via the API for E2E testing.
 *
 * Prepares random report data using the prepare function, then calls the report creation endpoint.
 * The generated report targets either a post or comment with a random violation reason and target UUID.
 * The report is created with a pending status, ready for moderator review.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial overrides for the report creation data
 * @returns The created ICommunityPlatformReport with full detail including reporter, community, and target associations
 */
export async function generate_random_community_platform_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReport.ICreate>;
  }
): Promise<ICommunityPlatformReport> {
  const prepared: ICommunityPlatformReport.ICreate = prepare_random_community_platform_report(
    props.body
  );
  const result: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}