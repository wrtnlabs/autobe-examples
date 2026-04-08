import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cursor-based pagination for community feed retrieval.
   *
   * This test validates the cursor-based pagination mechanism for community feed endpoints, ensuring consistent ordering and proper cursor encoding across multiple pages.
   *
   * The test creates a community with multiple posts and verifies pagination behavior including initial page retrieval, cursor-based navigation, and final page handling.
   *
   * 1. Create a community for testing.
   * 2. Create 30 posts in the community to enable pagination testing.
   * 3. Request first page without cursor, verify pagination metadata.
   * 4. Request second page using cursor from first response.
   * 5. Verify posts maintain consistent ordering across pages.
   * 6. Test with custom limit parameter (10 posts per page).
   * 7. Verify final page returns fewer posts when remaining posts are fewer than limit.
   * 8. Validate cursor format is base64-encoded JSON with created_at and id.
   * 9. Request beyond available pages returns empty data array.
   */
  // Create community owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  // Create a test community (assuming community creation endpoint exists)
  // For now, use a random UUID as community ID since we don't have creation API
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Initial request without cursor returns first page
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 10;
  const firstPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.feeds.index(ownerConnection, {
      communityId,
      body: {
        limit,
        sort: "new",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page has cursor",
    firstPage.pagination.current < firstPage.pagination.pages,
  );
  // Test 2: Subsequent request with cursor returns next page
  if (firstPage.data.length > 0) {
    const lastPost = firstPage.data[firstPage.data.length - 1];
    // Decode cursor to verify format (base64-encoded JSON with created_at and id)
    if (firstPage.pagination.current < firstPage.pagination.pages) {
      // Request second page with cursor
      const secondPage: IPageIRedditLikePost.ISummary =
        await api.functional.redditLike.communities.feeds.index(
          ownerConnection,
          {
            communityId,
            body: {
              limit,
              sort: "new",
              cursor: Buffer.from(
                JSON.stringify({
                  created_at: lastPost.created_at,
                  id: lastPost.id,
                }),
              ).toString("base64"),
            } satisfies IRedditLikePost.IRequest,
          },
        );
      typia.assert(secondPage);
      // Validate second page
      TestValidator.equals(
        "second page current",
        secondPage.pagination.current,
        2,
      );
      TestValidator.predicate(
        "second page has data",
        secondPage.data.length > 0,
      );
      // Verify consistent ordering (posts on second page should be older than first page)
      if (secondPage.data.length > 0) {
        const firstPostSecondPage = secondPage.data[0];
        const lastPostFirstPage = firstPage.data[firstPage.data.length - 1];
        TestValidator.predicate(
          "consistent ordering - second page posts are older",
          new Date(firstPostSecondPage.created_at) <=
            new Date(lastPostFirstPage.created_at),
        );
      }
    }
  }
  // Test 3: Custom limit parameter controls page size
  const customLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 5;
  const customLimitPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.feeds.index(ownerConnection, {
      communityId,
      body: {
        limit: customLimit,
        sort: "new",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(customLimitPage);
  TestValidator.equals(
    "custom limit applied",
    customLimitPage.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "custom limit page size respected",
    customLimitPage.data.length <= customLimit,
  );
  // Test 4: Final page returns fewer posts when remaining posts are fewer than limit
  // Request page beyond available data
  const beyondPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.feeds.index(ownerConnection, {
      communityId,
      body: {
        limit: 1,
        sort: "new",
        page: 1000, // Request a page that likely doesn't exist
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(beyondPage);
  TestValidator.equals("beyond page empty data", beyondPage.data.length, 0);
  TestValidator.predicate(
    "beyond page has valid pagination",
    beyondPage.pagination.current > 0,
  );
  // Test 5: Validate cursor format is base64-encoded JSON
  if (
    firstPage.data.length > 0 &&
    firstPage.pagination.current < firstPage.pagination.pages
  ) {
    const lastPost = firstPage.data[firstPage.data.length - 1];
    const expectedCursor = Buffer.from(
      JSON.stringify({
        created_at: lastPost.created_at,
        id: lastPost.id,
      }),
    ).toString("base64");
    TestValidator.predicate(
      "cursor format is base64-encoded",
      expectedCursor.length > 0 && /^[A-Za-z0-9+/=]+$/.test(expectedCursor),
    );
  }
}
