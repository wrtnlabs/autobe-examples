import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_link(
  input?: DeepPartial<ICommunityPlatformPostLink.ICreate> | undefined,
): ICommunityPlatformPostLink.ICreate {
  return {
    href: input?.href ?? typia.random<string & tags.Format<"uri">>(),
    displayTitle:
      input?.displayTitle ?? RandomGenerator.paragraph({ sentences: 1 }),
    displayDescription:
      input?.displayDescription ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
