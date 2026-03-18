import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_user_profile(
  input?: DeepPartial<ICommunityPlatformUserProfile.ICreate> | undefined,
): ICommunityPlatformUserProfile.ICreate {
  return {
    display_name: input?.display_name ?? RandomGenerator.name(3),
    bio:
      input?.bio !== undefined
        ? (input.bio as string | null)
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 2,
            wordMin: 3,
            wordMax: 8,
          }),
    avatar_uri:
      input?.avatar_uri !== undefined
        ? (input.avatar_uri as string | null)
        : typia.random<string & tags.Format<"url">>(),
  };
}
