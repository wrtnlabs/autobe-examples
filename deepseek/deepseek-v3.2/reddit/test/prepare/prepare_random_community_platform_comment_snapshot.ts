import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_snapshot(
  input?: DeepPartial<ICommunityPlatformCommentSnapshot.ICreate> | undefined,
): ICommunityPlatformCommentSnapshot.ICreate {
  const shouldGenerateEditorId = RandomGenerator.pick([true, false] as const);
  const shouldGenerateParentCommentId = RandomGenerator.pick([
    true,
    false,
    false,
  ] as const); // 33% chance to have parent
  return {
    comment_id:
      input?.comment_id ?? typia.random<string & tags.Format<"uuid">>(),
    editor_id:
      input?.editor_id !== undefined
        ? input.editor_id
        : shouldGenerateEditorId
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    status:
      input?.status ??
      RandomGenerator.pick(["created", "edited", "deleted"] as const),
    body:
      input?.body ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 5,
        wordMin: 5,
        wordMax: 15,
      }),
    parent_comment_id:
      input?.parent_comment_id !== undefined
        ? input.parent_comment_id
        : shouldGenerateParentCommentId
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    post_id: input?.post_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
