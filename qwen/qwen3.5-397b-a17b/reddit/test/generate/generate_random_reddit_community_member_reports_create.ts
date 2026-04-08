import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_reddit_community_report } from "../prepare/prepare_random_reddit_community_report";

/**
 * Generate a random Reddit community report via the API for E2E testing.
 *
 * Prepares random report data using the prepare function, then calls the creation endpoint to file a content report against a post or comment. The report_type determines whether the target is a post or comment, target_id references the content being reported, and reason provides the violation explanation.
 *
 * All properties support test-time customization through the DeepPartial input parameter, allowing tests to override specific fields while auto-generating the rest. The created report is returned with pending status and full entity metadata.
 *
 * @param connection - API connection information
 * @param props - Optional body customization via DeepPartial<IRedditCommunityReport.ICreate>
 * @returns The created IRedditCommunityReport entity with all fields populated
 */
export async function generate_random_reddit_community_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityReport.ICreate>;
  },
): Promise<IRedditCommunityReport> {
  const prepared: IRedditCommunityReport.ICreate =
    prepare_random_reddit_community_report(props.body);
  const result: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: prepared,
    });
  return result;
}
