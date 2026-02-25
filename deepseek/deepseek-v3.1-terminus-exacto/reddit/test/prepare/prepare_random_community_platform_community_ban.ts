import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_ban(
  input?: DeepPartial<ICommunityPlatformCommunityBan.ICreate>,
): ICommunityPlatformCommunityBan.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 15 }),
    expires_at:
      input?.expires_at ??
      (typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
      >() > 30
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
  };
}
