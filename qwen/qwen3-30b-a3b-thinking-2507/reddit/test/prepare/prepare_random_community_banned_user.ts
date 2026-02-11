import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_banned_user(
  input?: DeepPartial<ICommunityBannedUser.ICreate>,
): ICommunityBannedUser.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
