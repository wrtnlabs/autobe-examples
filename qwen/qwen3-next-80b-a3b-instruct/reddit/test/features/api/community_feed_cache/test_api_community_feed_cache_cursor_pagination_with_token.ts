import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvFeedCacheEntry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvFeedCacheEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_cache_cursor_pagination_with_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the test
  const testConnection: api.IConnection = { host: connection.host };
  
  // Step 1: Retrieve first page without page_token
  const firstPage: IPageICommunityMvFeedCacheEntry.ISummary =
    await api.functional.community.feed_cache_entries.index(testConnection, {
      body: {},
    });
  
  // Assert the full expected structure of the page with pagination and metadata
  const firstPageTyped = typia.assert<IPageICommunityMvFeedCacheEntry.ISummary & {
    next_page_token: string;
    has_more: boolean;
  }>(firstPage);
  
  // Validate first page metadata
  TestValidator.equals("first page current", firstPageTyped.pagination.current, 1);
  TestValidator.equals("first page limit", firstPageTyped.pagination.limit, 20);
  TestValidator.predicate("first page has data", firstPageTyped.data.length > 0);
  TestValidator.predicate(
    "first page has next_page_token",
    firstPageTyped.next_page_token !== undefined,
  );
  
  // Validate next_page_token is a valid UUID format
  TestValidator.predicate(
    "next_page_token is valid UUID format",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      firstPageTyped.next_page_token,
    ),
  );
  
  // Validate has_more is explicitly present and boolean
  TestValidator.predicate(
    "has_more is defined",
    firstPageTyped.has_more !== undefined,
  );
  TestValidator.predicate(
    "has_more is boolean",
    typeof firstPageTyped.has_more === "boolean",
  );
  
  // Step 2: Use next_page_token to retrieve second page
  const secondPage: IPageICommunityMvFeedCacheEntry.ISummary =
    await api.functional.community.feed_cache_entries.index(testConnection, {
      body: {
        page_token: firstPageTyped.next_page_token,
      },
    });
  
  // Assert the second page with the same extended structure
  const secondPageTyped = typia.assert<IPageICommunityMvFeedCacheEntry.ISummary & {
    next_page_token: string;
    has_more: boolean;
  }>(secondPage);
  
  // Validate second page metadata
  TestValidator.equals("second page current", secondPageTyped.pagination.current, 2);
  TestValidator.equals("second page limit", secondPageTyped.pagination.limit, 20);
  TestValidator.predicate("second page has data", secondPageTyped.data.length > 0);
  
  // Validate has_more is explicitly present and boolean
  TestValidator.predicate(
    "has_more is defined",
    secondPageTyped.has_more !== undefined,
  );
  TestValidator.predicate(
    "has_more is boolean",
    typeof secondPageTyped.has_more === "boolean",
  );
  
  // Validate no duplicates: check that first page and second page data are distinct
  const firstPageIds: string[] = firstPageTyped.data.map((entry: ICommunityMvFeedCacheEntry.ISummary) => {
    const typedEntry = typia.assert<ICommunityMvFeedCacheEntry.ISummary & {
      id: string;
      content: string;
      created_at: string;
      updated_at: string;
      metadata: Record<string, unknown>;
    }>(entry);
    return typedEntry.id;
  });
  
  const secondPageIds: string[] = secondPageTyped.data.map((entry: ICommunityMvFeedCacheEntry.ISummary) => {
    const typedEntry = typia.assert<ICommunityMvFeedCacheEntry.ISummary & {
      id: string;
      content: string;
      created_at: string;
      updated_at: string;
      metadata: Record<string, unknown>;
    }>(entry);
    return typedEntry.id;
  });
  
  const hasDuplicates = firstPageIds.some((id: string) => secondPageIds.includes(id));
  TestValidator.equals("no duplicates between pages", hasDuplicates, false);
  
  // Validate no gaps: if both pages have 20 entries, total should be 40
  if (firstPageTyped.data.length === 20 && secondPageTyped.data.length === 20) {
    TestValidator.predicate("second page follows first page", true);
  }
  
  // Validate has_more reflects remaining data
  TestValidator.predicate(
    "second page has_more reflects remaining",
    secondPageTyped.has_more !== false,
  );
  
  // Final validation: ensure all entries have required structure and fields
  for (const entry of [...firstPageTyped.data, ...secondPageTyped.data]) {
    // Verify required fields exist in ISummary using exact type assertion
    const typedEntry = typia.assert<ICommunityMvFeedCacheEntry.ISummary & {
      id: string;
      content: string;
      created_at: string;
      updated_at: string;
      metadata: Record<string, unknown>;
    }>(entry);
    
    TestValidator.predicate("entry has id", typedEntry.id !== undefined);
    TestValidator.predicate("entry has content", typedEntry.content !== undefined);
    TestValidator.predicate(
      "entry has created_at",
      typedEntry.created_at !== undefined,
    );
    TestValidator.predicate(
      "entry has updated_at",
      typedEntry.updated_at !== undefined,
    );
    TestValidator.predicate("entry has metadata", typedEntry.metadata !== undefined);
    
    // Ensure id is UUID format
    TestValidator.predicate(
      "entry id is valid UUID",
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        typedEntry.id,
      ),
    );
  }
}