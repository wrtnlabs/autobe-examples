import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_retrieval_with_negative_karma(
  connection: api.IConnection,
): Promise<void> {
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const profile = await api.functional.reddit.profiles.at(connection, {
    profileId,
  });
  typia.assert(profile);
  TestValidator.predicate("karma must be negative", profile.karma < 0);
}
