import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfile";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
export async function test_api_profile_search_by_karma_range(connection: api.IConnection): Promise<void> {
    const response = await api.functional.reddit.profiles.index(connection, {
        body: {
            minKarma: 100,
            maxKarma: 500
        }
    });
    typia.assert(response);
    for (const profile of response.data) {
        TestValidator.predicate(`Profile ${profile.id} karma is within [100, 500]`,
      profile.karma >= 100 && profile.karma <= 500
    );
  }
}