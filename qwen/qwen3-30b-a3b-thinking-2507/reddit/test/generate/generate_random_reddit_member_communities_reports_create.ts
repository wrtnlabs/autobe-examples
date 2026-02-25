import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_report } from "../prepare/prepare_random_reddit_report";

export async function generate_random_reddit_member_communities_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditReport.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditReport> {
  const prepared: IRedditReport.ICreate = prepare_random_reddit_report(
    props.body,
  );
  return await api.functional.reddit.member.communities.reports.create(
    connection,
    {
      communityId: props.params.communityId,
      body: prepared,
    },
  );
}
