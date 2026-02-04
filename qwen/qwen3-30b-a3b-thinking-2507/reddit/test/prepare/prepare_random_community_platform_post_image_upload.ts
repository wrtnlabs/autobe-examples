import { ICommunityPlatformPostImageUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_image_upload(
  input?: DeepPartial<ICommunityPlatformPostImageUpload.ICreate>,
): ICommunityPlatformPostImageUpload.ICreate {
  return {
    name:
      input?.name ??
      typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
    extension:
      input?.extension ?? RandomGenerator.pick(["jpg", "png", "gif"] as const),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
