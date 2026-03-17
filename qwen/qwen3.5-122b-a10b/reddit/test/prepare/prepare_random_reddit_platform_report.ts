import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_report(
  input?: DeepPartial<IRedditPlatformReport.ICreate> | undefined,
): IRedditPlatformReport.ICreate {
  const post_id =
    input?.post_id ??
    (typia.random<boolean>()
      ? typia.random<string & tags.Format<"uuid">>()
      : null);
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    post_id: post_id,
    comment_id:
      input?.comment_id ??
      (post_id === null ? typia.random<string & tags.Format<"uuid">>() : null),
  };
}
