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

export async function test_api_community_browse_paginated_directory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Browse page 1 with limit 20
  const page1 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page1);
  // 2. Validate pagination metadata
  TestValidator.equals("page number", page1.pagination.current, 1);
  TestValidator.equals("page limit", page1.pagination.limit, 20);
  TestValidator.predicate("has records", page1.pagination.records > 0);
  TestValidator.equals(
    "pages computed",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // 3. Validate communities are ordered by subscriber_count DESC
  for (let i: number = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      `subscriber count descending at index ${i}`,
      page1.data[i - 1].subscriber_count >= page1.data[i].subscriber_count,
    );
  }
  // 4. Validate each community's structure
  for (const community of page1.data) {
    typia.assert(community);
    // Validate icon_uri is nullable
    if (community.icon_uri !== null) {
      TestValidator.predicate(
        "icon_uri is valid uri",
        typeof community.icon_uri === "string",
      );
    }
    // Validate owner structure
    typia.assert(community.owner);
    TestValidator.predicate(
      "owner has id",
      typeof community.owner.id === "string",
    );
    TestValidator.predicate(
      "owner has email",
      typeof community.owner.email === "string",
    );
    TestValidator.predicate(
      "owner has username",
      typeof community.owner.username === "string",
    );
    TestValidator.predicate(
      "owner has created_at",
      typeof community.owner.created_at === "string",
    );
  }
  // 5. Browse page 2 with same limit
  const page2 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page2);
  // 6. Validate page 2 pagination
  TestValidator.equals("page 2 number", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 20);
  TestValidator.predicate(
    "page 2 records match",
    page2.pagination.records === page1.pagination.records,
  );
  // 7. Validate that page 2 data doesn't overlap with page 1
  if (page2.data.length > 0 && page1.data.length > 0) {
    TestValidator.notEquals(
      "page 2 different from page 1",
      page2.data[0],
      page1.data[0],
    );
  }
  // 8. Validate page 2 communities ordering
  for (let i: number = 1; i < page2.data.length; i++) {
    TestValidator.predicate(
      `page 2 subscriber count descending at index ${i}`,
      page2.data[i - 1].subscriber_count >= page2.data[i].subscriber_count,
    );
  }
}
