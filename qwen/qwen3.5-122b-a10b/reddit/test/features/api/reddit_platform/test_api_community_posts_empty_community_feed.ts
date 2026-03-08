import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_posts_empty_community_feed(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a random community ID (this community will have no posts)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Define request body with pagination parameters
  const body = {
    page: 1,
    limit: 20,
    sort_by: "new",
  } satisfies IRedditPlatformPost.IRequest;
  // Call the API to retrieve posts from the empty community
  const output: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.communities.posts.index(
      testConnection,
      {
        communityId,
        body,
      },
    );
  // Assert the response type is correct
  typia.assert(output);
  // Verify the data array is empty
  TestValidator.equals("data array is empty", output.data.length, 0);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit matches request", output.pagination.limit, 20);
  TestValidator.equals("total records is 0", output.pagination.records, 0);
  TestValidator.equals("total pages is 0", output.pagination.pages, 0);
}
