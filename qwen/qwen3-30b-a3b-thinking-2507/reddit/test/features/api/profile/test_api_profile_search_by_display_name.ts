import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfile";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare search request with partial 'joh' substring
  const searchName = "joh";
  const request: IRedditProfile.IRequest = {
    display_name: searchName,
  } satisfies IRedditProfile.IRequest;
  // 2. Execute search
  const response = await api.functional.reddit.profiles.index(connection, {
    body: request,
  });
  typia.assert(response);
  // 3. Validate search results contain entries with 'joh' in display name (case-insensitive)
  for (const profile of response.data) {
    TestValidator.predicate(
      `Display name contains '${searchName}' (case-insensitive)`,
      profile.display_name.toLowerCase().includes(searchName.toLowerCase()),
    );
    // Validate required summary fields exist
    TestValidator.equals(
      `Profile has display name`,
      profile.display_name,
      profile.display_name,
    );
    TestValidator.notEquals(`Profile has valid bio`, profile.bio, undefined);
    TestValidator.predicate(`Profile has positive karma`, profile.karma > 0);
    TestValidator.notEquals(
      `Profile has avatar URL`,
      profile.avatar,
      undefined,
    );
  }
  // 4. Verify pagination metadata is present
  TestValidator.equals(
    `Pagination current page`,
    response.pagination.current,
    1,
  );
  TestValidator.notEquals(
    `Pagination records count`,
    response.pagination.records,
    0,
  );
}
