import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment(
  input?: DeepPartial<ICommunityPlatformComment.ICreate>,
): ICommunityPlatformComment.ICreate {
  return {
    body:
      input?.body ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    parentId: input?.parentId !== undefined ? input.parentId : undefined,
  };
}
