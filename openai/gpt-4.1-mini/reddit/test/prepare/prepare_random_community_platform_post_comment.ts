import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_comment(
  input?: DeepPartial<ICommunityPlatformPostComment.ICreate>,
): ICommunityPlatformPostComment.ICreate {
  return {
    post_id: input?.post_id ?? typia.random<string & tags.Format<"uuid">>(),
    content_text:
      input?.content_text ?? RandomGenerator.paragraph({ sentences: 2 }),
    parent_comment_id:
      input?.parent_comment_id ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
  };
}
