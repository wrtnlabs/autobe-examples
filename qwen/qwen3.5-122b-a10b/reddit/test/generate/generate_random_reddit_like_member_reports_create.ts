import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_report } from "../prepare/prepare_random_reddit_like_report";

/**
 * Generate a random content report via the API for E2E testing.
 *
 * Prepares random report data using the prepare function, then calls the creation endpoint to submit a content violation report for moderator review.
 *
 * @param connection The HTTP connection configuration
 * @param props Report creation properties with optional body overrides
 * @returns The created report object with assigned ID and pending status
 */
export async function generate_random_reddit_like_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeReport.ICreate>;
  },
): Promise<IRedditLikeReport> {
  const prepared: IRedditLikeReport.ICreate = prepare_random_reddit_like_report(
    props.body,
  );
  const result: IRedditLikeReport =
    await api.functional.redditLike.member.reports.create(connection, {
      body: prepared,
    });
  return result;
}
