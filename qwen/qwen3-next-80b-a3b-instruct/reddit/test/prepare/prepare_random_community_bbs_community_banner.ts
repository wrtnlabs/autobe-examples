import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityBanner";
export function prepare_random_community_bbs_community_banner(
  input?: DeepPartial<ICommunityBbsCommunityBanner.ICreate> | undefined,
): ICommunityBbsCommunityBanner.ICreate {
  return {
    community_code: input?.community_code ?? RandomGenerator.alphabets(8),
    image_url: input?.image_url ?? typia.random<string & tags.Format<"uri">>(),
    priority:
      input?.priority ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
