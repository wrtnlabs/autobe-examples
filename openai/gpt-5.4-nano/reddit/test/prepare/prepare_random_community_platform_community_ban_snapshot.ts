import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_ban_snapshot(
  input?: DeepPartial<ICommunityPlatformCommunityBanSnapshot.ICreate>,
): ICommunityPlatformCommunityBanSnapshot.ICreate {
  const effective_from =
    input?.effective_from ?? typia.random<string & tags.Format<"date-time">>();
  const effective_from_ms = new Date(effective_from).getTime();
  const generated_effective_until = typia.random<
    string & tags.Format<"date-time">
  >();
  const generated_effective_until_ms = new Date(
    generated_effective_until,
  ).getTime();
  const safe_effective_until =
    generated_effective_until_ms >= effective_from_ms
      ? generated_effective_until
      : effective_from;
  return {
    ban_status: input?.ban_status ?? RandomGenerator.alphabets(12),
    reason: input?.reason ?? RandomGenerator.content({ paragraphs: 1 }),
    effective_from,
    effective_until:
      input?.effective_until === undefined
        ? Math.random() < 0.4
          ? null
          : safe_effective_until
        : input.effective_until,
  };
}
