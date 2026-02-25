import { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_file(
  input?: DeepPartial<ICommunityFile.ICreate>,
): ICommunityFile.ICreate {
  return {
    file_type:
      input?.file_type ??
      RandomGenerator.pick(["AVATAR", "COMMUNITY_ICON", "POST_IMAGE"] as const),
    file: input?.file ?? RandomGenerator.alphaNumeric(100),
  };
}
