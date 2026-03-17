import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_report(
  input?: DeepPartial<ICommunityReport.ICreate> | undefined,
): ICommunityReport.ICreate {
  return {
    post_id:
      input?.post_id !== undefined
        ? input.post_id
        : typia.random<string & tags.Format<"uuid">>(),
    comment_id: input?.comment_id !== undefined ? input.comment_id : null,
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
