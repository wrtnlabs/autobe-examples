import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_report } from "../prepare/prepare_random_reddit_platform_report";

/**
 * Generate a random report via the API for E2E testing.
 *
 * Prepares random report data using the prepare function, then calls the creation endpoint.
 * The report is created with a random violation reason, target content identifier, and
 * target type discriminator (post or comment).
 *
 * @param connection - API connection with authentication context
 * @param props.body - Optional partial override for prepared data
 * @returns The created report entity with all fields populated
 */
export async function generate_random_reddit_platform_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformReport.ICreate> | undefined;
  },
): Promise<IRedditPlatformReport> {
  const prepared: IRedditPlatformReport.ICreate =
    prepare_random_reddit_platform_report(props.body);
  return await api.functional.redditPlatform.member.reports.create(connection, {
    body: prepared,
  });
}
