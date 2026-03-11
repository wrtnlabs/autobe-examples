import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest filtering by email domain or partial matching.
 *
 * Verify that the guest listing API correctly filters by email using partial matching.
 * Test scenarios include exact email match, domain matching, partial username matching,
 * and empty filter conditions.
 */
export async function test_api_guest_listing_email_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Generate test emails with different domains for filtering scenarios
  const gmailEmails = ArrayUtil.repeat(3, () =>
    typia.random<
      string & tags.Format<"email"> & tags.Pattern<".*@gmail\\.com$">
    >(),
  ) satisfies string[];
  const yahooEmails = ArrayUtil.repeat(2, () =>
    typia.random<
      string & tags.Format<"email"> & tags.Pattern<".*@yahoo\\.com$">
    >(),
  ) satisfies string[];
  const randomEmails = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"email">>(),
  ) satisfies string[];
  // Combine all test emails
  const allTestEmails = [...gmailEmails, ...yahooEmails, ...randomEmails];
  // Test 1: Exact email matching
  for (const email of allTestEmails.slice(0, 3)) {
    const response = await api.functional.multiUserTodo.guests.index(
      connection,
      {
        body: {
          email: email satisfies string & tags.Format<"email">,
          limit: 10,
        } satisfies IMultiUserTodoGuest.IRequest,
      },
    );
    typia.assert(response);
    // Verify all returned guests contain the exact email or are empty if no match
    response.data.forEach((guest) => {
      TestValidator.equals(
        `guest email should contain ${email}`,
        guest.email.includes(email.split("@")[0]),
        true,
      );
    });
  }
  // Test 2: Domain partial matching (@gmail.com)
  const gmailResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        email: "gmail.com" satisfies string & tags.Format<"email">,
        limit: 20,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(gmailResponse);
  // Verify all returned guests are from gmail domain
  gmailResponse.data.forEach((guest) => {
    TestValidator.predicate(
      `guest email should contain gmail.com: ${guest.email}`,
      guest.email.includes("gmail.com"),
    );
  });
  // Test 3: Partial username matching
  const testEmail = allTestEmails[0];
  const usernamePart = testEmail.split("@")[0].substring(0, 4);
  const partialResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        email: usernamePart satisfies string & tags.Format<"email">,
        limit: 15,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(partialResponse);
  // Verify all returned guests contain the partial username
  partialResponse.data.forEach((guest) => {
    TestValidator.predicate(
      `guest email should contain ${usernamePart}: ${guest.email}`,
      guest.email.includes(usernamePart),
    );
  });
  // Test 4: Empty email filter (should return all guests with pagination)
  const emptyFilterResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(emptyFilterResponse);
  TestValidator.predicate(
    "pagination should be valid",
    emptyFilterResponse.pagination.current === 1 &&
      emptyFilterResponse.pagination.limit === 5 &&
      emptyFilterResponse.pagination.records >= 0 &&
      emptyFilterResponse.pagination.pages >= 0,
  );
  // Test 5: Email filter with date range
  const dateFilterResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        email: "test" satisfies string & tags.Format<"email">,
        created_after: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        limit: 10,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(dateFilterResponse);
  // Test 6: Combined filter with include_deleted
  const combinedResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        email: "example" satisfies string & tags.Format<"email">,
        include_deleted: true,
        limit: 8,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(combinedResponse);
}
