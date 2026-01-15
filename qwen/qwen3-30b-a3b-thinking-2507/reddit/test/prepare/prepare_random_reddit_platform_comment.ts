import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
export function prepare_random_reddit_platform_comment(
  input?: DeepPartial<IRedditPlatformComment.ICreate>,
): IRedditPlatformComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.paragraph({
        sentences:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>>()
      }),
  };
}