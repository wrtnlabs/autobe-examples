import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_comment(
  input?: DeepPartial<ICommunityComment.ICreate> | undefined,
): ICommunityComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: input?.parent_id !== undefined ? input.parent_id : null,
  };
}
