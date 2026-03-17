import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_link(
  input?: DeepPartial<ICommunityPlatformPostLink.ICreate>,
): ICommunityPlatformPostLink.ICreate {
  return {
    target_url:
      input?.target_url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
