import { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_invitation(
  input?:
    | DeepPartial<ICommunityPlatformCommunityInvitation.ICreate>
    | undefined,
): ICommunityPlatformCommunityInvitation.ICreate {
  return {
    invitee_id:
      input?.invitee_id ?? typia.random<string & tags.Format<"uuid">>(),
    message:
      input?.message ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 2 })
        : null),
  };
}
