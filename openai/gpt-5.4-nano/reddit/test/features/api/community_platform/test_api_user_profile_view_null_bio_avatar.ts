import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_view_null_bio_avatar(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: No scenario-specific write APIs are available in the provided SDK inputs.
  // Therefore, this test uses the endpoint with a generated UUID and validates
  // the response contract, including that nullable persona fields may be null.
  const userConnection: api.IConnection = { host: connection.host };
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const profile = await api.functional.communityPlatform.profiles.at(
    userConnection,
    {
      profileId,
    },
  );
  typia.assert(profile);
  TestValidator.predicate(
    "display_name is non-null string",
    profile.display_name !== null && profile.display_name.length > 0,
  );
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("avatar_uri is null", profile.avatar_uri, null);
}
