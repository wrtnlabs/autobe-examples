import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_report } from "../prepare/prepare_random_reddit_clone_report";

/**
 * Generate a random Reddit clone report for E2E testing.
 *
 * Prepares random report data using the prepare function, then calls the creation endpoint.
 * The report can target either a post or comment, with a randomly selected report type
 * (spam, harassment, violence, etc.) and a generated reason explaining the violation.
 * Reports are created with 'pending' status and become visible to moderators for review.
 */
export async function generate_random_reddit_clone_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneReport.ICreate> | undefined;
  },
): Promise<IRedditCloneReport> {
  const prepared: IRedditCloneReport.ICreate =
    prepare_random_reddit_clone_report(props.body);
  const result: IRedditCloneReport =
    await api.functional.redditClone.member.reports.create(connection, {
      body: prepared,
    });
  return result;
}
