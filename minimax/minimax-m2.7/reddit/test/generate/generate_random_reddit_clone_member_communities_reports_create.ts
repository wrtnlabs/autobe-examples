import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community_report } from "../prepare/prepare_random_reddit_clone_community_report";

export async function generate_random_reddit_clone_member_communities_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunityReport.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCloneCommunityReport> {
  const prepared: IRedditCloneCommunityReport.ICreate =
    prepare_random_reddit_clone_community_report(props.body);
  const result: IRedditCloneCommunityReport =
    await api.functional.redditClone.member.communities.reports.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
