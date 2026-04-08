import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_file_association(
  input?: DeepPartial<IRedditCloneFileAssociation.ICreate>,
): IRedditCloneFileAssociation.ICreate {
  // Generate base64-like string for image data simulation
  const imageDataLength = typia.random<
    number & tags.Minimum<50> & tags.Maximum<500>
  >();
  const base64Image = RandomGenerator.alphaNumeric(imageDataLength);
  const paddedImageData = base64Image + "==";
  return {
    imageData: input?.imageData ?? paddedImageData,
    filename:
      input?.filename ??
      ((RandomGenerator.alphabets(12) + ".png") as string &
        tags.MinLength<1> &
        tags.MaxLength<255>),
  };
}
