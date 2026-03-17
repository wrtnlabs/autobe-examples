import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_attachment_thumbnail(
  input?: DeepPartial<IRedditLikeAttachmentThumbnail.ICreate>,
): IRedditLikeAttachmentThumbnail.ICreate {
  return {
    width:
      input?.width ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<500>
      >(),
    height:
      input?.height ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<500>
      >(),
    quality:
      input?.quality ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    format:
      input?.format ?? RandomGenerator.pick(["jpeg", "png", "webp"] as const),
  };
}
