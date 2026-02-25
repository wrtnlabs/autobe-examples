import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_deleted_content(
  input?: DeepPartial<ICommunityPlatformDeletedContent.ICreate>,
): ICommunityPlatformDeletedContent.ICreate {
  const postIdIsDefined =
    input?.post_id !== undefined && input?.post_id !== null;
  const commentIdIsDefined =
    input?.comment_id !== undefined && input?.comment_id !== null;
  const post_id = postIdIsDefined
    ? input!.post_id!
    : commentIdIsDefined
      ? null
      : typia.random<string & tags.Format<"uuid">>();
  const comment_id = commentIdIsDefined
    ? input!.comment_id!
    : postIdIsDefined
      ? null
      : typia.random<string & tags.Format<"uuid">>();
  return {
    moderator_id:
      input?.moderator_id ?? typia.random<string & tags.Format<"uuid">>(),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    post_id,
    comment_id,
  };
}
