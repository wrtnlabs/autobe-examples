import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification record search by partial email match and sorting.
 *
 * Validates that email verification records can be searched by a substring of the member's email address and sorted by different fields. After creating a member account through the join flow, the test extracts a random portion of the member's email and verifies the search returns the matching verification record.
 *
 * Special attention is given to case-insensitive search validation and sort direction testing. The test confirms that the sort_field and sort_direction parameters correctly order results by email ascending and by expires_at ascending.
 *
 * 1. Member joins with randomly generated credentials, automatically creating an email verification record.
 * 2. A random substring of the member's email is extracted and used to search verification records.
 * 3. Search results are validated to contain the member's verification record via exact email match.
 * 4. Case-insensitive search is validated using an uppercase version of the same substring.
 * 5. Sort by email ascending is tested and the result order is validated lexicographically.
 * 6. Sort by expires_at ascending is tested and the result order is validated chronologically.
 */
export async function test_api_email_verification_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Extract a random substring from the member's email for partial match search
  const email = member.email;
  const searchSubstring = RandomGenerator.substring(email);
  // 3. Search verification records by partial email match
  const searchResult =
    await api.functional.erpHrm.member.email_verifications.index(
      memberConnection,
      {
        body: {
          search: searchSubstring,
        } satisfies IErpHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "verification record found by partial email substring",
    searchResult.data.length >= 1 &&
      searchResult.data.some((v) => v.email === email),
  );
  // 4. Validate case-insensitive search
  const upperSearch = searchSubstring.toUpperCase();
  const caseResult =
    await api.functional.erpHrm.member.email_verifications.index(
      memberConnection,
      {
        body: {
          search: upperSearch,
        } satisfies IErpHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(caseResult);
  TestValidator.predicate(
    "case-insensitive search returns the same record",
    caseResult.data.length >= 1 &&
      caseResult.data.some((v) => v.email === email),
  );
  // 5. Sort by email ascending
  const emailSortResult =
    await api.functional.erpHrm.member.email_verifications.index(
      memberConnection,
      {
        body: {
          search: searchSubstring,
          sort_field: "email",
          sort_direction: "asc",
        } satisfies IErpHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emailSortResult);
  if (emailSortResult.data.length >= 2) {
    const emails = emailSortResult.data.map((v) => v.email);
    TestValidator.predicate(
      "results sorted by email ascending",
      emails.every((e, i) => i === 0 || e >= emails[i - 1]),
    );
  }
  // 6. Sort by expires_at ascending
  const expiresSortResult =
    await api.functional.erpHrm.member.email_verifications.index(
      memberConnection,
      {
        body: {
          search: searchSubstring,
          sort_field: "expires_at",
          sort_direction: "asc",
        } satisfies IErpHrmMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiresSortResult);
  if (expiresSortResult.data.length >= 2) {
    const expires = expiresSortResult.data.map((v) => v.expires_at);
    TestValidator.predicate(
      "results sorted by expires_at ascending",
      expires.every((e, i) => i === 0 || e >= expires[i - 1]),
    );
  }
}
