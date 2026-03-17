import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_index_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get first page of members (default: page=1, limit=20, no auth required)
  const page1 = await api.functional.redditCommunity.members.index(connection, {
    body: {
      page: 1,
      limit: 20,
      sortBy: "created_at",
      sortOrder: "desc",
    } satisfies IRedditCommunityMember.IRequest,
  });
  typia.assert(page1);
  // 2. Verify pagination metadata
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 20);
  TestValidator.predicate(
    "page1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  // 3. Verify data array structure
  const members = page1.data;
  // 4. If there are members, validate each record structure
  if (members.length > 0) {
    for (const member of members) {
      // Verify required fields exist
      TestValidator.predicate("member has id", member.id !== undefined);
      TestValidator.predicate(
        "member has username",
        member.username !== undefined,
      );
      TestValidator.predicate(
        "member has created_at",
        member.created_at !== undefined,
      );
      // Verify UUID format for id
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      TestValidator.predicate("id is valid UUID", uuidPattern.test(member.id));
      // Verify datetime format for created_at
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      TestValidator.predicate(
        "created_at is valid datetime",
        datePattern.test(member.created_at),
      );
      // Verify profile exists and has required fields
      if (member.profile) {
        TestValidator.predicate(
          "profile has display_name",
          member.profile.display_name !== undefined,
        );
        TestValidator.predicate(
          "profile has karma_score",
          member.profile.karma_score !== undefined,
        );
        TestValidator.predicate(
          "profile has created_at",
          member.profile.created_at !== undefined,
        );
        // bio and avatar can be null or undefined
        if (member.profile.bio !== undefined) {
          TestValidator.predicate(
            "bio is string or null",
            member.profile.bio === null ||
              typeof member.profile.bio === "string",
          );
        }
        if (member.profile.avatar_image_url !== undefined) {
          TestValidator.predicate(
            "avatar is uri or null",
            member.profile.avatar_image_url === null ||
              typeof member.profile.avatar_image_url === "string",
          );
        }
      }
      // Verify karma field at member level
      if (member.karma !== undefined) {
        TestValidator.predicate(
          "karma is integer",
          Number.isInteger(member.karma),
        );
      }
    }
    // 5. Verify sorting: created_at should be in descending order
    if (members.length > 1) {
      for (let i = 0; i < members.length - 1; i++) {
        TestValidator.predicate(
          `member ${i} created_at >= member ${i + 1}`,
          new Date(members[i].created_at) >=
            new Date(members[i + 1].created_at),
        );
      }
    }
  }
  // 6. Test pagination - request page 2
  const page2 = await api.functional.redditCommunity.members.index(connection, {
    body: {
      page: 2,
      limit: 20,
    } satisfies IRedditCommunityMember.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 20);
  // If total records <= 20, page 2 should be empty
  if (page1.pagination.records <= 20) {
    TestValidator.equals(
      "page2 data empty when records <= limit",
      page2.data.length,
      0,
    );
  } else {
    TestValidator.equals(
      "page2 has data when records > limit",
      page2.data.length > 0,
      true,
    );
  }
  // 7. Verify pagination metadata consistency
  if (page1.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1.pagination.records / page1.pagination.limit,
    );
    TestValidator.equals(
      "page1 pages calculation",
      page1.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "no records means no pages",
      page1.pagination.pages,
      0,
    );
  }
}
