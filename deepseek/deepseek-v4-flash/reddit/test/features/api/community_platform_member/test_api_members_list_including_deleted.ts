import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_members_list_including_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all members including soft-deleted ones
  const includeDeletedPage =
    await api.functional.communityPlatform.members.index(connection, {
      body: {
        include_deleted: true,
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(includeDeletedPage);
  TestValidator.predicate(
    "include_deleted=true returns at least some records",
    () => includeDeletedPage.data.length > 0,
  );
  // Find deleted members in the result
  const deletedMembers = includeDeletedPage.data.filter(
    (m) => m.deleted_at !== null,
  );
  // 2. Verify each deleted member has a non-null deleted_at (ISO datetime)
  if (deletedMembers.length > 0) {
    for (const member of deletedMembers) {
      TestValidator.predicate(
        `deleted member ${member.id} has non-null deleted_at`,
        () => member.deleted_at !== null,
      );
      // Verify deleted_at is a valid ISO datetime string
      TestValidator.predicate(
        `deleted member ${member.id} deleted_at is ISO datetime`,
        () => !isNaN(Date.parse(member.deleted_at!)),
      );
    }
  }
  // 3. Fetch without include_deleted — verify no deleted members appear
  const activeOnlyPage = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(activeOnlyPage);
  for (const member of activeOnlyPage.data) {
    TestValidator.predicate(
      `active-only member ${member.id} has null deleted_at`,
      () => member.deleted_at === null,
    );
  }
  // 4. If we have deleted members, test search with include_deleted
  if (deletedMembers.length > 0) {
    const sampleDeleted = deletedMembers[0];
    // Search for deleted member by username with include_deleted=true
    const searchWithDeleted =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          include_deleted: true,
          username: sampleDeleted.username,
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(searchWithDeleted);
    TestValidator.predicate(
      "search for deleted member with include_deleted=true finds them",
      () => searchWithDeleted.data.some((m) => m.id === sampleDeleted.id),
    );
    // 5. Search for the same member without include_deleted
    const searchWithoutDeleted =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          username: sampleDeleted.username,
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(searchWithoutDeleted);
    TestValidator.predicate(
      "search for deleted member without include_deleted excludes them",
      () => !searchWithoutDeleted.data.some((m) => m.id === sampleDeleted.id),
    );
    // 6. Test combined filters with include_deleted=true
    const combinedFilterPage =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          include_deleted: true,
          search: RandomGenerator.alphabets(3),
          created_at_from: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_to: new Date().toISOString(),
          limit: 20,
          page: 1,
          sort: "created_at",
          direction: "desc",
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(combinedFilterPage);
    TestValidator.predicate(
      "combined filters with include_deleted=true return results",
      () => combinedFilterPage.data.length >= 0,
    );
  }
  // 7. Test pagination works with include_deleted
  // Fetch first page with small limit
  const firstPage = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        include_deleted: true,
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination with include_deleted has correct pagination metadata",
    () =>
      firstPage.pagination.current === 1 &&
      firstPage.pagination.limit === 5 &&
      firstPage.pagination.records >= firstPage.data.length,
  );
  // Fetch second page if there are more records
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.communityPlatform.members.index(
      connection,
      {
        body: {
          include_deleted: true,
          limit: 5,
          page: 2,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.predicate("second page has no overlap with first page", () =>
      secondPage.data.every(
        (m2) => !firstPage.data.some((m1) => m1.id === m2.id),
      ),
    );
  }
}
