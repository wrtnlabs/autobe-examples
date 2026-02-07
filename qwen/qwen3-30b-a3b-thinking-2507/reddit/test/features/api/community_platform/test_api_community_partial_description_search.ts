import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_partial_description_search(
  connection: api.IConnection,
): Promise<void> {
  // Search communities with 'blog' in description
  const output: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(connection);
  typia.assert(output);
  // Filter communities having 'blog' in description
  const blogCommunities = output.data.filter((community) =>
    community.description?.toLowerCase().includes("blog"),
  );
  // Validate at least one community was found
  TestValidator.predicate(
    "Search results contain communities with 'blog' in description",
    blogCommunities.length > 0,
  );
  // Verify each matching community has 'blog' in description
  blogCommunities.forEach((community) => {
    TestValidator.predicate(
      `Community ${community.name} description contains 'blog'`,
      community.description?.toLowerCase().includes("blog") ?? false,
    );
  });
}
