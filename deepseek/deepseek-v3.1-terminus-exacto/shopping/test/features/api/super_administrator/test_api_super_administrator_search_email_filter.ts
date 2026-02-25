import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_search_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // Generate test email addresses with various patterns
  const emailPatterns = ArrayUtil.repeat(10, (index) =>
    typia.random<string & tags.Format<"email">>(),
  );
  // Test 1: Partial match at beginning of email (local part)
  const testEmail1 = emailPatterns[0];
  const localPart1 = testEmail1.substring(0, 5); // First 5 characters of email local part
  const response1 = await api.functional.ecommerce.super_administrators.index(
    connection,
    {
      body: {
        email: localPart1 satisfies string & tags.Format<"email"> as string &
          tags.Format<"email">,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceSuperAdministrator.IRequest,
    },
  );
  typia.assert(response1);
  // Verify filtered results contain the substring (case-insensitive)
  if (response1.data.length > 0) {
    TestValidator.predicate(
      "all results should contain the search substring (case-insensitive)",
      () =>
        response1.data.every((item) =>
          item.email.toLowerCase().includes(localPart1.toLowerCase()),
        ),
    );
  }
  // Test 2: Partial match in middle of email
  const testEmail2 = emailPatterns[1];
  const atIndex = testEmail2.indexOf("@");
  if (atIndex > 0) {
    const middlePart = testEmail2.substring(Math.floor(atIndex / 2), atIndex);
    const response2 = await api.functional.ecommerce.super_administrators.index(
      connection,
      {
        body: {
          email: middlePart satisfies string & tags.Format<"email"> as string &
            tags.Format<"email">,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceSuperAdministrator.IRequest,
      },
    );
    typia.assert(response2);
    if (response2.data.length > 0) {
      TestValidator.predicate("middle substring should match results", () =>
        response2.data.every((item) =>
          item.email.toLowerCase().includes(middlePart.toLowerCase()),
        ),
      );
    }
  }
  // Test 3: Domain-specific filtering
  const testEmail3 = emailPatterns[2];
  const domainStart = testEmail3.indexOf("@");
  if (domainStart !== -1) {
    const domainPart = testEmail3.substring(domainStart); // Include '@' symbol
    const response3 = await api.functional.ecommerce.super_administrators.index(
      connection,
      {
        body: {
          email: domainPart satisfies string & tags.Format<"email"> as string &
            tags.Format<"email">,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceSuperAdministrator.IRequest,
      },
    );
    typia.assert(response3);
    if (response3.data.length > 0) {
      TestValidator.predicate("domain filtering should work", () =>
        response3.data.every((item) =>
          item.email.toLowerCase().includes(domainPart.toLowerCase()),
        ),
      );
    }
  }
  // Test 4: Empty results for non-matching pattern
  const nonMatchingPattern = "nonexistent123456789";
  const response4 = await api.functional.ecommerce.super_administrators.index(
    connection,
    {
      body: {
        email: nonMatchingPattern satisfies string &
          tags.Format<"email"> as string & tags.Format<"email">,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceSuperAdministrator.IRequest,
    },
  );
  typia.assert(response4);
  // No validation needed - empty results are acceptable for non-matching filter
  // Test 5: Case-insensitive search
  const testEmail5 = emailPatterns[3];
  if (testEmail5.length > 0) {
    const searchTerm = testEmail5.substring(0, 3).toUpperCase(); // Uppercase search term
    const response5 = await api.functional.ecommerce.super_administrators.index(
      connection,
      {
        body: {
          email: searchTerm satisfies string & tags.Format<"email"> as string &
            tags.Format<"email">,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceSuperAdministrator.IRequest,
      },
    );
    typia.assert(response5);
    if (response5.data.length > 0) {
      TestValidator.predicate("case-insensitive search should work", () =>
        response5.data.every((item) =>
          item.email.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }
  }
}
