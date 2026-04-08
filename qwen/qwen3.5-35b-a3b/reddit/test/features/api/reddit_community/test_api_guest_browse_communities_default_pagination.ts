import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_browse_communities_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account (authentication prerequisite)
  const joinConnection: api.IConnection = { host: connection.host };
  const guestAccount = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAccount);
  // 2. Create authenticated guest connection for API calls
  // authorize_guest_join updates joinConnection.headers with token
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: joinConnection.headers,
  };
  // 3. Browse communities with default pagination (no query params)
  const page1Response =
    await api.functional.redditCommunity.guest.browse_communities.browse(
      guestConnection,
    );
  typia.assert(page1Response);
  // 4. Validate pagination metadata on first page
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals(
    "page 1 limit (default)",
    page1Response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 1 records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 5. Verify data array exists and has entries
  typia.assert(page1Response.data);
  TestValidator.predicate(
    "page 1 data has entries",
    page1Response.data.length > 0,
  );
  // 6. Validate each community has required fields
  for (const community of page1Response.data) {
    typia.assert(community);
    // Required fields
    TestValidator.predicate(
      "community id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );
    TestValidator.predicate(
      "community name is non-empty string",
      typeof community.name === "string" && community.name.length > 0,
    );
    TestValidator.predicate(
      "community created_at is valid timestamp",
      typeof community.created_at === "string" &&
        !Number.isNaN(Date.parse(community.created_at)),
    );
    // Optional fields may be null or undefined
    if (community.description !== null && community.description !== undefined) {
      TestValidator.predicate(
        "community description is string when present",
        typeof community.description === "string",
      );
    }
    // subscriber_count may be undefined
    if (community.subscriber_count !== undefined) {
      TestValidator.predicate(
        "community subscriber_count is non-negative integer",
        Number.isInteger(community.subscriber_count) &&
          community.subscriber_count >= 0,
      );
    }
    // deleted_at should be null for non-deleted communities
    if (community.deleted_at !== undefined) {
      TestValidator.equals(
        "community is not deleted",
        community.deleted_at,
        null,
      );
    }
  }
  // 7. Verify sorting: subscriber_count descending, then id ascending
  if (page1Response.data.length > 1) {
    for (let i = 1; i < page1Response.data.length; i++) {
      const prev = page1Response.data[i - 1];
      const curr = page1Response.data[i];
      // Check if both have subscriber_count defined before comparing
      if (
        prev.subscriber_count !== undefined &&
        curr.subscriber_count !== undefined
      ) {
        if (prev.subscriber_count !== curr.subscriber_count) {
          TestValidator.predicate(
            `sort subscriber_count desc at index ${i}`,
            prev.subscriber_count > curr.subscriber_count,
          );
        } else {
          // When subscriber_count is equal, id should be ascending
          TestValidator.predicate(
            `sort id asc for ties at index ${i}`,
            curr.id > prev.id,
          );
        }
      }
    }
  }
  // 8. If multiple pages exist, test page 2 with cursor
  if (page1Response.pagination.pages > 1) {
    const page2Response =
      await api.functional.redditCommunity.guest.browse_communities.browse(
        guestConnection,
      );
    typia.assert(page2Response);
    TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
    // Verify continuation of sorting
    if (page2Response.data.length > 0) {
      typia.assert(page2Response.data);
      // All communities on page 2 should have lower or equal subscriber_count than page 1's last item
      if (page1Response.data.length > 0) {
        const lastPage1 = page1Response.data[page1Response.data.length - 1];
        const firstPage2 = page2Response.data[0];
        if (
          lastPage1.subscriber_count !== undefined &&
          firstPage2.subscriber_count !== undefined
        ) {
          TestValidator.predicate(
            "page 2 has lower or equal subscriber_count than page 1 end",
            firstPage2.subscriber_count <= lastPage1.subscriber_count,
          );
        }
      }
    }
  }
}