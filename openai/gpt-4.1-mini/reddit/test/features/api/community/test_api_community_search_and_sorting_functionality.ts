import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_community_search_and_sorting_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Perform user join and obtain authorized user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Prepare test communities for search and sorting
  // Create 3 distinct communities using patch endpoint is not provided, so we simulate by search later
  // Instead, we use random community names and test the search on them by calling index
  // 3. Test searching communities by partial name match (case-insensitive)
  // We pick multiple random substrings from known community names to test
  const allCommunityNames = ArrayUtil.repeat(3, () => RandomGenerator.name(1));
  // We test partial search for each name
  for (const name of allCommunityNames) {
    // partial substring
    const partial = RandomGenerator.substring(name).toLowerCase();
    if (partial.length === 0) continue; // safety
    const body: ICommunityPlatformCommunity.IRequest = { name: partial };
    const result =
      await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body },
      );
    typia.assert(result);
    // Validate all returned community names contain the substring case-insensitively
    TestValidator.predicate(
      `all communities contain substring '${partial}'`,
      result.data.every((comm) => comm.name.toLowerCase().includes(partial)),
    );
  }
  // 4. Test searching communities by full name match
  // Using one of the community names as exact match
  const exactName = RandomGenerator.pick(allCommunityNames);
  const exactResult =
    await api.functional.communityPlatform.user.communities.index(
      userConnection,
      {
        body: { name: exactName },
      },
    );
  typia.assert(exactResult);
  TestValidator.predicate(
    `all communities contain exact name '${exactName}'`,
    exactResult.data.every((comm) => comm.name === exactName),
  );
  // 5. Test searching with non-existing community name to get empty results
  const nonExistingName = RandomGenerator.alphabets(20);
  const emptyResult =
    await api.functional.communityPlatform.user.communities.index(
      userConnection,
      {
        body: { name: nonExistingName },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // 6. Test sorting options
  const sorts: ("new" | "old" | "popular")[] = ["new", "old", "popular"];
  for (const sort of sorts) {
    const body: ICommunityPlatformCommunity.IRequest = { sort };
    const pageResult =
      await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body },
      );
    typia.assert(pageResult);
    // Check sorting order: for 'new' and 'old', order by createdAt Date
    if (sort === "new") {
      for (let i = 1; i < pageResult.data.length; i++) {
        const prev = new Date(pageResult.data[i - 1].createdAt).getTime();
        const curr = new Date(pageResult.data[i].createdAt).getTime();
        TestValidator.predicate("new sort order descending", prev >= curr);
      }
    } else if (sort === "old") {
      for (let i = 1; i < pageResult.data.length; i++) {
        const prev = new Date(pageResult.data[i - 1].createdAt).getTime();
        const curr = new Date(pageResult.data[i].createdAt).getTime();
        TestValidator.predicate("old sort order ascending", prev <= curr);
      }
    } else {
      // popular sort order: subscriberCount descending
      for (let i = 1; i < pageResult.data.length; i++) {
        const prev = pageResult.data[i - 1].subscriberCount;
        const curr = pageResult.data[i].subscriberCount;
        TestValidator.predicate("popular sort order descending", prev >= curr);
      }
    }
  }
}
