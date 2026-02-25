import { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_sort_order(
  input?: DeepPartial<ICommunityPlatformCommentSortOrder.ICreate>,
): ICommunityPlatformCommentSortOrder.ICreate {
  return {
    communityPlatformCommentId:
      input?.communityPlatformCommentId ??
      typia.random<string & tags.Format<"uuid">>(),
    strategy: input?.strategy ?? RandomGenerator.alphabets(8),
    sortValue: input?.sortValue ?? typia.random<number & tags.Type<"int32">>(),
  };
}
