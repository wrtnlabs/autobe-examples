import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_snapshot(
  input?: DeepPartial<ICommunityPlatformCommunitySnapshot.ICreate> | undefined,
): ICommunityPlatformCommunitySnapshot.ICreate {
  return {
    code: input?.code ?? RandomGenerator.alphabets(10),
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    type:
      input?.type ??
      RandomGenerator.pick(["public", "private", "restricted"] as const),
    status:
      input?.status ??
      RandomGenerator.pick([
        "active",
        "inactive",
        "pending",
        "banned",
      ] as const),
    visibility:
      input?.visibility ??
      RandomGenerator.pick(["public", "private", "hidden"] as const),
    is_nsfw: input?.is_nsfw ?? RandomGenerator.pick([true, false] as const),
    is_archived:
      input?.is_archived ?? RandomGenerator.pick([true, false] as const),
    is_locked: input?.is_locked ?? RandomGenerator.pick([true, false] as const),
    member_count:
      input?.member_count ?? typia.random<number & tags.Type<"int32">>(),
    subscriber_count:
      input?.subscriber_count ?? typia.random<number & tags.Type<"int32">>(),
    post_count:
      input?.post_count ?? typia.random<number & tags.Type<"int32">>(),
    comment_count:
      input?.comment_count ?? typia.random<number & tags.Type<"int32">>(),
    owner_member_id:
      input?.owner_member_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
