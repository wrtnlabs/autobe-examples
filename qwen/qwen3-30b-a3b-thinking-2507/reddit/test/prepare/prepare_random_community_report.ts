import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_report(
  input?: DeepPartial<ICommunityReport.ICreate>,
): ICommunityReport.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
    community_post_id: input?.community_post_id
      ? input.community_post_id
      : typia.random<string & tags.Format<"uuid">>(),
    community_comment_id: input?.community_comment_id
      ? input.community_comment_id
      : typia.random<string & tags.Format<"uuid">>(),
  };
}
