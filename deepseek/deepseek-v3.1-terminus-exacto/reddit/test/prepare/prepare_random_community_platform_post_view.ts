import { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_view(
  input?: DeepPartial<ICommunityPlatformPostView.ICreate>,
): ICommunityPlatformPostView.ICreate {
  return {
    ip_address:
      input?.ip_address ?? typia.random<string & tags.Format<"ipv4">>(),
    user_agent: input?.user_agent ?? RandomGenerator.alphabets(20),
    referrer: input?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    view_duration:
      input?.view_duration ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
