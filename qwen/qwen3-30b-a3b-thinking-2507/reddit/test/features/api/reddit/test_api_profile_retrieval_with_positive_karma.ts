import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_retrieval_with_positive_karma(
  connection: api.IConnection,
): Promise<void> {
  const randomProfileId = typia.random<string & tags.Format<"uuid">>();
  const profileConnection = { host: connection.host };
  const profile = await api.functional.reddit.profiles.at(profileConnection, {
    profileId: randomProfileId,
  });
  typia.assert(profile);
  TestValidator.predicate("positive karma in profile", profile.karma > 0);
}
