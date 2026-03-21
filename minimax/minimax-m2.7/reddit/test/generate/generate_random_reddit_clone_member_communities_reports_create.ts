import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_report } from "../prepare/prepare_random_reddit_clone_report";

export async function generate_random_reddit_clone_member_communities_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneReport.ICreate>;
    params: {
      communityName: string;
    };
  },
): Promise<IRedditCloneReport> {
  const prepared: IRedditCloneReport.ICreate =
    prepare_random_reddit_clone_report(props.body);
  const result: IRedditCloneReport =
    await api.functional.redditClone.member.communities.reports.create(
      connection,
      {
        communityName: props.params.communityName,
        body: prepared,
      },
    );
  return result;
}
