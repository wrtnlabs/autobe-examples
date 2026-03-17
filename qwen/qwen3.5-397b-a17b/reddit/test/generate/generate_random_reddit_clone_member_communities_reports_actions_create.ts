import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_report_action } from "../prepare/prepare_random_reddit_clone_report_action";

export async function generate_random_reddit_clone_member_communities_reports_actions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneReportAction.ICreate>;
    params: {
      communityId: string;
      reportId: string;
    };
  },
): Promise<IRedditCloneReportAction> {
  const prepared: IRedditCloneReportAction.ICreate =
    prepare_random_reddit_clone_report_action(props.body);
  const result: IRedditCloneReportAction =
    await api.functional.redditClone.member.communities.reports.actions.create(
      connection,
      {
        communityId: props.params.communityId,
        reportId: props.params.reportId,
        body: prepared,
      },
    );
  return result;
}
