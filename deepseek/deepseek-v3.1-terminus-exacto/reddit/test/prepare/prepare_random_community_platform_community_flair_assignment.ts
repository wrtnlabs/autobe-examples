import { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_flair_assignment(
  input?: DeepPartial<ICommunityPlatformCommunityFlairAssignment.ICreate>,
): ICommunityPlatformCommunityFlairAssignment.ICreate {
  return {
    community_platform_user_id:
      input?.community_platform_user_id ??
      typia.random<string & tags.Format<"uuid">>(),
    community_platform_community_flair_id:
      input?.community_platform_community_flair_id ??
      typia.random<string & tags.Format<"uuid">>(),
    expired_at: input?.expired_at !== undefined ? input.expired_at : null,
  };
}
