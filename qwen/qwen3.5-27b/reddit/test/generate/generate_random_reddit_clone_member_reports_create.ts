import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_report } from "../prepare/prepare_random_reddit_clone_report";

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
