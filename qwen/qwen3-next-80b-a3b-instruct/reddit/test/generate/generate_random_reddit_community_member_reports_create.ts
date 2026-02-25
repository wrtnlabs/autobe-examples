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

export async function generate_random_reddit_community_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityReport.ICreate> | undefined;
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
