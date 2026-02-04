import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate>,
): ICommunityPlatformPost.ICreate {
  return {
    title: input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>>(),
      }),
    content: input?.content ??
      RandomGenerator.content({
        paragraphs: typia.random<number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>>(),
      }),
    type: RandomGenerator.pick(["text", "link", "image"] as const),
    community_id: typia.random<string & tags.Format<"uuid">>(),
  };
}