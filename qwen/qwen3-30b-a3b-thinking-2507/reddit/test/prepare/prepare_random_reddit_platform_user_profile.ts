import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserProfile";
export function prepare_random_reddit_platform_user_profile(
  input?: DeepPartial<IRedditPlatformUserProfile.ICreate>,
): IRedditPlatformUserProfile.ICreate {
  return {
    bio:
      input?.bio ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
      }),
    profileImageUrl:
      input?.profileImageUrl ??
      typia.random<string & tags.MinLength<1> & tags.Format<"uri">>(),
  };
}
