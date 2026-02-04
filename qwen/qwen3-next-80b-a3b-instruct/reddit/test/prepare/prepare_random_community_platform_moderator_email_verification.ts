import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModeratorEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorEmailVerification";
export function prepare_random_community_platform_moderator_email_verification(
  input?:
    | DeepPartial<ICommunityPlatformModeratorEmailVerification.ICreate>
    | undefined,
): ICommunityPlatformModeratorEmailVerification.ICreate {
  return {
    id: typia.random<string & tags.Format<"uuid">>(),
    token: RandomGenerator.alphaNumeric(64),
    created_at: new Date().toISOString(),
    expires_at: new Date(new Date().getTime() + 172800000).toISOString(),
  };
}
