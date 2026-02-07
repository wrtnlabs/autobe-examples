import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_report } from "../prepare/prepare_random_reddit_platform_report";

export async function generate_random_reddit_platform_user_posts_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformReport.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditPlatformReport> {
  const prepared: IRedditPlatformReport.ICreate =
    prepare_random_reddit_platform_report(props.body);
  return await api.functional.redditPlatform.user.posts.reports.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
