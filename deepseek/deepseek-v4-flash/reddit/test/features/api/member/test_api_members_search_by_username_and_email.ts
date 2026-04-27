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

export async function test_api_members_search_by_username_and_email(
  connection: api.IConnection,
): Promise<void> {
  // Fetch all members first to use as reference data for meaningful search queries
  const allMembers = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(allMembers);
  const hasMembers = allMembers.data.length > 0;
  // 1. Search by partial email substring — verify results contain members whose email OR username contains the search term (case-insensitive ILIKE match)
  if (hasMembers) {
    const member = allMembers.data[0];
    const partialEmail = member.email.substring(0, 5);
    const searchResult = await api.functional.communityPlatform.members.index(
      connection,
      {
        body: {
          search: partialEmail,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(searchResult);
    TestValidator.predicate(
      "search by email substring matches email or username",
      () =>
        searchResult.data.every(
          (m) =>
            m.email.includes(partialEmail) || m.username.includes(partialEmail),
        ),
    );
  }
  // 2. Email parameter specifically — verify results filtered to only members whose email matches
  if (hasMembers) {
    const member = allMembers.data[0];
    const partialEmail = member.email.substring(0, 5);
    const emailResult = await api.functional.communityPlatform.members.index(
      connection,
      {
        body: {
          email: partialEmail,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(emailResult);
    TestValidator.predicate(
      "email filter returns members with matching email only",
      () => emailResult.data.every((m) => m.email.includes(partialEmail)),
    );
  }
  // 3. Username parameter specifically — verify results filtered to only members whose username matches
  if (hasMembers) {
    const member = allMembers.data[0];
    const partialUsername = member.username.substring(0, 3);
    const usernameResult = await api.functional.communityPlatform.members.index(
      connection,
      {
        body: {
          username: partialUsername,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(usernameResult);
    TestValidator.predicate(
      "username filter returns members with matching username only",
      () =>
        usernameResult.data.every((m) => m.username.includes(partialUsername)),
    );
  }
  // 4. Both search and email combined — verify AND logic between filters
  if (hasMembers) {
    const member = allMembers.data[0];
    const partialTerm = member.email.substring(0, 5);
    const combinedResult = await api.functional.communityPlatform.members.index(
      connection,
      {
        body: {
          search: partialTerm,
          email: partialTerm,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(combinedResult);
    TestValidator.predicate(
      "combined search+email returns members matching both criteria",
      () =>
        combinedResult.data.every(
          (m) =>
            (m.email.includes(partialTerm) ||
              m.username.includes(partialTerm)) &&
            m.email.includes(partialTerm),
        ),
    );
  }
  // 5. Search term matching no members — verify empty data with pagination metadata showing 0 records and pages=0
  const emptySearch = RandomGenerator.alphaNumeric(32);
  const emptyResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        search: emptySearch,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search has 0 data items",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search has 0 records total",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  // 6. Sort by username in ascending order — verify A-Z order
  if (hasMembers && allMembers.data.length >= 2) {
    const sortUsernameAscResult =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          sort: "username",
          direction: "asc",
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(sortUsernameAscResult);
    if (sortUsernameAscResult.data.length >= 2) {
      TestValidator.predicate("username ascending sort is A-Z", () => {
        for (let i = 1; i < sortUsernameAscResult.data.length; i++) {
          if (
            sortUsernameAscResult.data[i].username <
            sortUsernameAscResult.data[i - 1].username
          ) {
            return false;
          }
        }
        return true;
      });
    }
  }
  // 7. Sort by email in descending order — verify Z-A order
  if (hasMembers && allMembers.data.length >= 2) {
    const sortEmailDescResult =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          sort: "email",
          direction: "desc",
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(sortEmailDescResult);
    if (sortEmailDescResult.data.length >= 2) {
      TestValidator.predicate("email descending sort is Z-A", () => {
        for (let i = 1; i < sortEmailDescResult.data.length; i++) {
          if (
            sortEmailDescResult.data[i].email >
            sortEmailDescResult.data[i - 1].email
          ) {
            return false;
          }
        }
        return true;
      });
    }
  }
  // 8. Sort by created_at in ascending order — verify oldest members appear first
  if (hasMembers && allMembers.data.length >= 2) {
    const sortCreatedAscResult =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          sort: "created_at",
          direction: "asc",
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(sortCreatedAscResult);
    if (sortCreatedAscResult.data.length >= 2) {
      TestValidator.predicate(
        "created_at ascending sort has oldest first",
        () => {
          for (let i = 1; i < sortCreatedAscResult.data.length; i++) {
            if (
              sortCreatedAscResult.data[i].created_at <
              sortCreatedAscResult.data[i - 1].created_at
            ) {
              return false;
            }
          }
          return true;
        },
      );
    }
  }
  // 9. Date range filtering using created_at_from and created_at_to — verify only members within range
  if (hasMembers) {
    const fromDate = new Date(0).toISOString();
    const toDate = new Date().toISOString();
    const dateRangeResult =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(dateRangeResult);
    TestValidator.predicate(
      "date range filter returns members within range",
      () =>
        dateRangeResult.data.every(
          (m) => m.created_at >= fromDate && m.created_at <= toDate,
        ),
    );
  }
  // 10. Date range combined with search filter — verify both filters applied together (AND logic)
  if (hasMembers) {
    const member = allMembers.data[0];
    const partialTerm = member.email.substring(0, 5);
    const fromDate = new Date(0).toISOString();
    const toDate = new Date().toISOString();
    const combinedDateSearchResult =
      await api.functional.communityPlatform.members.index(connection, {
        body: {
          search: partialTerm,
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(combinedDateSearchResult);
    TestValidator.predicate(
      "date range + search combined returns members matching both",
      () =>
        combinedDateSearchResult.data.every(
          (m) =>
            (m.email.includes(partialTerm) ||
              m.username.includes(partialTerm)) &&
            m.created_at >= fromDate &&
            m.created_at <= toDate,
        ),
    );
  }
}
