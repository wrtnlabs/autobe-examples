import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_post_image(
  input?: DeepPartial<IRedditLikePostImage.ICreate>,
): IRedditLikePostImage.ICreate {
  return {
    attachmentId:
      input?.attachmentId ?? typia.random<string & tags.Format<"uuid">>(),
    displayOrder:
      input?.displayOrder ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
