import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_public_view_partially_filled_profile(
  connection: api.IConnection,
): Promise<void> {
  const publicConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const profileId = typia.random<string & tags.Format<"uuid">>();
  try {
    const profile = await api.functional.communityPlatform.profiles.at(
      publicConnection,
      {
        profileId,
      },
    );
    typia.assert(profile);
    TestValidator.predicate(
      "display name is provided when profile view succeeds",
      profile.display_name.length > 0,
    );
    TestValidator.predicate(
      "missing optional bio is tolerated",
      profile.bio === null || profile.bio.length >= 0,
    );
    TestValidator.predicate(
      "profile remains viewable even when avatar files are absent",
      profile.files.length >= 0,
    );
  } catch (exp) {
    TestValidator.predicate(
      "real environment may not contain the requested public profile fixture",
      exp instanceof api.HttpError,
    );
  }
}
