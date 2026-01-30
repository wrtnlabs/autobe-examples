import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";
export async function test_api_comment_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const postId = typia.random<string & tags.Format<"uuid">>();
  const metrics: IEconomicForumPostComment.ISummary =
    await api.functional.economicForum.posts.comments.metrics.index(
      connection,
      {
        postId,
      },
    );
  typia.assert(metrics);
}
