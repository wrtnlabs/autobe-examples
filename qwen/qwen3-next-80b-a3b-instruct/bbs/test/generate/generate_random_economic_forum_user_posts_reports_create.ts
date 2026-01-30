import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostReport";
import { prepare_random_economic_forum_post_report } from "../prepare/prepare_random_economic_forum_post_report";
export async function generate_random_economic_forum_user_posts_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumPostReport.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IEconomicForumPostReport> {
  const prepared: IEconomicForumPostReport.ICreate =
    prepare_random_economic_forum_post_report(props.body);
  return await api.functional.economicForum.user.posts.reports.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
