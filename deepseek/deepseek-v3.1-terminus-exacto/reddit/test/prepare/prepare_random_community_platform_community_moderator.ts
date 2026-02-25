import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_moderator(
  input?: DeepPartial<ICommunityPlatformCommunityModerator.ICreate> | undefined,
): ICommunityPlatformCommunityModerator.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    role_level:
      input?.role_level ??
      RandomGenerator.pick([
        "admin",
        "moderator",
        "super_moderator",
        "senior_moderator",
      ] as const),
    notes:
      input?.notes !== undefined
        ? input.notes
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
