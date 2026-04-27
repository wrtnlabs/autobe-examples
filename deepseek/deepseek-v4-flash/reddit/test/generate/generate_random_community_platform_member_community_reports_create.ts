import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_report } from "../prepare/prepare_random_community_platform_community_report";

/**
 * Generate a random community platform community report via the API for E2E testing.
 *
 * Prepares random report data using the prepare function, then calls the report
 * creation endpoint to submit a report against a post or comment that violates
 * community standards. The report reason and target details are randomized.
 *
 * @param connection The API connection configuration
 * @param props Optional partial report data to override default random values
 * @returns The created community report record
 */
export async function generate_random_community_platform_member_community_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityReport.ICreate> | undefined;
  }
): Promise<ICommunityPlatformCommunityReport> {
  const prepared: ICommunityPlatformCommunityReport.ICreate = prepare_random_community_platform_community_report(
    props.body
  );
  return await api.functional.communityPlatform.member.communityReports.create(
    connection,
    {
      body: prepared,
    },
  );
}
