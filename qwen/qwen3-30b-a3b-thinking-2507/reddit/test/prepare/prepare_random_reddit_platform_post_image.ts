import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
export function prepare_random_reddit_platform_post_image(
  input?: DeepPartial<IRedditPlatformPostImage.ICreate> | undefined,
): IRedditPlatformPostImage.ICreate {
  return {
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
    caption:
      input?.caption ??
      RandomGenerator.paragraph({
        sentences: typia.random<number & tags.Minimum<1> & tags.Maximum<3>>(),
      }),
  };
}
