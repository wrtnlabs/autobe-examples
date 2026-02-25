import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_moderator(
  input?: DeepPartial<ICommunityModerator.ICreate>,
): ICommunityModerator.ICreate {
  return {
    member_username:
      input?.member_username ??
      RandomGenerator.alphaNumeric(10),
  };
}