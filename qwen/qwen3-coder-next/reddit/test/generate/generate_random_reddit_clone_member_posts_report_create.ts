import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_content_report } from "../prepare/prepare_random_reddit_clone_content_report";

export async function generate_random_reddit_clone_member_posts_report_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneContentReport.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<void> {
  const prepared: IRedditCloneContentReport.ICreate =
    prepare_random_reddit_clone_content_report(props.body);
  return await api.functional.redditClone.member.posts.report.create(
    connection,
    {
      postId: props.params.postId,
      body: prepared,
    },
  );
}
