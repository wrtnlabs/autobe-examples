import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_post_image(
  input?: DeepPartial<IRedditCommunityPostImage.ICreate>,
): IRedditCommunityPostImage.ICreate {
  return {
    filePath:
      input?.filePath ?? `/uploads/images/${RandomGenerator.alphabets(16)}.jpg`,
    fileSize:
      input?.fileSize ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<1024> &
          tags.Maximum<10485760>
      >(),
    mimeType:
      input?.mimeType ??
      RandomGenerator.pick([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ] as const),
    width:
      input?.width ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
      >(),
    height:
      input?.height ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
      >(),
  };
}
