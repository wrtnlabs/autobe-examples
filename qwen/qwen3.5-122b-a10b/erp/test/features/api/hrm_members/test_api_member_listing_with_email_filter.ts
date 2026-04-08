import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_listing_with_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // Fetch all existing members to use as test data
  const allMembers = await api.functional.hrm.members.index(connection, {
    body: {} satisfies IHrmMember.IRequest,
  });
  typia.assert(allMembers);
  // If no members exist, skip detailed filtering tests
  if (allMembers.data.length === 0) {
    return;
  }
  // Test 1: Email prefix filtering - test with first few characters of existing emails
  const testEmails = allMembers.data.slice(0, 5); // Use up to 5 members for testing
  if (testEmails.length === 0) {
    return;
  }
  // Extract email prefixes to test
  const prefixTests = testEmails.map((member) => {
    const email = member.email;
    // Get first 4 characters as prefix
    const prefix = email.substring(0, 4);
    return { member, prefix };
  });
  for (const { member, prefix } of prefixTests) {
    const filteredResult = await api.functional.hrm.members.index(connection, {
      body: {
        email: prefix,
      } satisfies IHrmMember.IRequest,
    });
    typia.assert(filteredResult);
    // Verify the original member is in the filtered results
    const found = filteredResult.data.some((m) => m.id === member.id);
    TestValidator.predicate(
      `member with email "${member.email}" found when filtering by prefix "${prefix}"`,
      found,
    );
    // Verify all returned members contain the prefix
    for (const filteredMember of filteredResult.data) {
      TestValidator.predicate(
        `filtered member email contains "${prefix}"`,
        filteredMember.email.toLowerCase().includes(prefix.toLowerCase()),
      );
    }
    // Verify pagination reflects filtered count
    TestValidator.equals(
      `filtered records count matches data array length for prefix "${prefix}"`,
      filteredResult.pagination.records,
      filteredResult.data.length,
    );
  }
  // Test 2: Email domain filtering - test with @domain.com patterns
  const domainTests = testEmails
    .map((member) => {
      const email = member.email;
      // Extract domain part
      const atIndex = email.indexOf("@");
      if (atIndex === -1) return null;
      const domain = email.substring(atIndex);
      return { member, domain };
    })
    .filter(
      (
        test,
      ): test is {
        member: IHrmMember.ISummary;
        domain: string;
      } => test !== null,
    );
  for (const { member, domain } of domainTests) {
    const filteredResult = await api.functional.hrm.members.index(connection, {
      body: {
        email: domain,
      } satisfies IHrmMember.IRequest,
    });
    typia.assert(filteredResult);
    // Verify the original member is in the filtered results
    const found = filteredResult.data.some((m) => m.id === member.id);
    TestValidator.predicate(
      `member with email "${member.email}" found when filtering by domain "${domain}"`,
      found,
    );
    // Verify all returned members contain the domain
    for (const filteredMember of filteredResult.data) {
      TestValidator.predicate(
        `filtered member email contains domain "${domain}"`,
        filteredMember.email.toLowerCase().includes(domain.toLowerCase()),
      );
    }
  }
  // Test 3: Case-insensitive filtering
  const sampleMember = testEmails[0];
  const upperCaseFilter = sampleMember.email.substring(0, 3).toUpperCase();
  const lowerCaseFilter = sampleMember.email.substring(0, 3).toLowerCase();
  const upperResult = await api.functional.hrm.members.index(connection, {
    body: {
      email: upperCaseFilter,
    } satisfies IHrmMember.IRequest,
  });
  typia.assert(upperResult);
  const lowerResult = await api.functional.hrm.members.index(connection, {
    body: {
      email: lowerCaseFilter,
    } satisfies IHrmMember.IRequest,
  });
  typia.assert(lowerResult);
  // Both should return the same count (case-insensitive)
  TestValidator.equals(
    "case-insensitive filtering returns same count for upper and lower case",
    upperResult.pagination.records,
    lowerResult.pagination.records,
  );
  // Test 4: Non-matching filter returns empty results
  const nonMatchingFilter = "xyznonexistent12345";
  const nonMatchingResult = await api.functional.hrm.members.index(connection, {
    body: {
      email: nonMatchingFilter,
    } satisfies IHrmMember.IRequest,
  });
  typia.assert(nonMatchingResult);
  TestValidator.equals(
    "non-matching filter returns zero records",
    nonMatchingResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching filter returns empty data array",
    nonMatchingResult.data.length,
    0,
  );
  // Test 5: Verify pagination metadata accuracy for full list
  TestValidator.equals(
    "total records matches data array length for unfiltered query",
    allMembers.pagination.records,
    allMembers.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    allMembers.pagination.pages ===
      Math.ceil(allMembers.pagination.records / allMembers.pagination.limit),
  );
  // Test 6: Substring filtering (middle of email)
  if (testEmails.length > 0) {
    const middleMember = testEmails[0];
    const email = middleMember.email;
    const atIndex = email.indexOf("@");
    if (atIndex > 4) {
      // Extract substring from local part (before @)
      const substring = email.substring(2, atIndex - 1);
      const substringResult = await api.functional.hrm.members.index(
        connection,
        {
          body: {
            email: substring,
          } satisfies IHrmMember.IRequest,
        },
      );
      typia.assert(substringResult);
      // Verify the original member is included
      const found = substringResult.data.some((m) => m.id === middleMember.id);
      TestValidator.predicate(
        `member found when filtering by substring "${substring}"`,
        found,
      );
      // Verify all results contain the substring
      for (const filteredMember of substringResult.data) {
        TestValidator.predicate(
          `filtered member email contains substring "${substring}"`,
          filteredMember.email.toLowerCase().includes(substring.toLowerCase()),
        );
      }
    }
  }
}
