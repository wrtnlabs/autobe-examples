import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_link(
  input?: DeepPartial<ICommunityPlatformPostLink.ICreate> | undefined,
): ICommunityPlatformPostLink.ICreate {
  return {
    url:
      input?.url ??
      typia.random<string & tags.Format<"url"> & tags.MaxLength<80000>>(),
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      }),
    thumbnail_url:
      input?.thumbnail_url ??
      typia.random<string & tags.Format<"url"> & tags.MaxLength<80000>>(),
  };
}
