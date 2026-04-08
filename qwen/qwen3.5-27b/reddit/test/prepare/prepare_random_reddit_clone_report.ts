import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone report creation data for E2E testing.
 *
 * Generates a complete IRedditCloneReport.ICreate with randomized values.
 * The report_type is selected from common report categories (spam, harassment,
 * violence, etc.). Either post_id or comment_id (or both) can be provided to
 * indicate which content is being reported. The reason field contains a
 * human-readable explanation of why the content violates community guidelines.
 */
export function prepare_random_reddit_clone_report(
  input?: DeepPartial<IRedditCloneReport.ICreate> | undefined,
): IRedditCloneReport.ICreate {
  return {
    report_type:
      input?.report_type ??
      RandomGenerator.pick([
        "spam",
        "harassment",
        "violence",
        "hate_speech",
        "misinformation",
        "self_harm",
        "sexual_content",
        "other",
      ] as const),
    post_id: input?.post_id ?? typia.random<string & tags.Format<"uuid">>(),
    comment_id:
      input?.comment_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
