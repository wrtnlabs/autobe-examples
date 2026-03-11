import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_post_image(
  input?: DeepPartial<IRedditPlatformPostImage.ICreate>,
): IRedditPlatformPostImage.ICreate {
  return {
    filename:
      input?.filename ??
      `${RandomGenerator.alphaNumeric(8)}.${RandomGenerator.pick(["jpg", "png", "gif"] as const)}`,
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick(["image/jpeg", "image/png", "image/gif"] as const),
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >(),
    file_path:
      input?.file_path ??
      `uploads/posts/${typia.random<string & tags.Format<"uuid">>()}/${input?.filename ?? `${RandomGenerator.alphaNumeric(8)}.${RandomGenerator.pick(["jpg", "png", "gif"] as const)}`}`,
  };
}