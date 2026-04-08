import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberEmailVerification";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to create email verification records
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create admin connection to query email verifications
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const allVerifications =
    await api.functional.redditPlatform.member.email_verifications.index(
      adminConnection,
      {
        body: {
          member_id: memberAuth.id,
          limit: 100,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(allVerifications);
  // Store the verification records for testing
  const verifications = allVerifications.data;
  TestValidator.notEquals(
    "should have verifications",
    verifications,
    undefined,
  );
  if (verifications.length === 0) {
    throw new Error("No email verifications found for the member");
  }
  // 3. Test created_at_range filter
  const firstVerification = verifications[0];
  const lastVerification = verifications[verifications.length - 1];
  // Create a date range using the created_at of existing records
  const rangeStart =
    new Date(firstVerification.created_at).getTime() - 86400000; // 1 day before
  const rangeEnd = new Date(lastVerification.created_at).getTime() + 86400000; // 1 day after
  const dateRangeFilter = {
    gte: new Date(rangeStart).toISOString(),
    lte: new Date(rangeEnd).toISOString(),
  };
  const filteredByCreated =
    await api.functional.redditPlatform.member.email_verifications.index(
      adminConnection,
      {
        body: {
          member_id: memberAuth.id,
          created_at_range: dateRangeFilter,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(filteredByCreated);
  // 4. Verify only records within date range are returned
  for (const verification of filteredByCreated.data) {
    const createdAt = new Date(verification.created_at).getTime();
    TestValidator.predicate(
      "created_at within range (gte)",
      createdAt >= new Date(dateRangeFilter.gte!).getTime(),
    );
    TestValidator.predicate(
      "created_at within range (lte)",
      createdAt <= new Date(dateRangeFilter.lte!).getTime(),
    );
  }
  // 5. Test expires_at_range filter
  let expiresAtFilter:
    | {
        gte: string;
        lte: string;
      }
    | undefined = undefined;
  if (verifications.length >= 2) {
    const secondVerification = verifications[1];
    const expiresStart =
      new Date(secondVerification.expires_at).getTime() - 86400000;
    const expiresEnd =
      new Date(secondVerification.expires_at).getTime() + 86400000;
    expiresAtFilter = {
      gte: new Date(expiresStart).toISOString(),
      lte: new Date(expiresEnd).toISOString(),
    };
    const filteredByExpires =
      await api.functional.redditPlatform.member.email_verifications.index(
        adminConnection,
        {
          body: {
            member_id: memberAuth.id,
            expires_at_range: expiresAtFilter,
          } satisfies IRedditPlatformMemberEmailVerification.IRequest,
        },
      );
    typia.assert(filteredByExpires);
    // 6. Verify only records within expires_at range are returned
    for (const verification of filteredByExpires.data) {
      const expiresAt = new Date(verification.expires_at).getTime();
      TestValidator.predicate(
        "expires_at within range (gte)",
        expiresAt >= new Date(expiresAtFilter.gte).getTime(),
      );
      TestValidator.predicate(
        "expires_at within range (lte)",
        expiresAt <= new Date(expiresAtFilter.lte).getTime(),
      );
    }
  }
  // 7. Test combined filters
  const defaultExpiresFilter = {
    gte: new Date().toISOString(),
    lte: new Date(Date.now() + 86400000 * 7).toISOString(),
  };
  const combinedFilter = {
    created_at_range: dateRangeFilter,
    expires_at_range: expiresAtFilter ?? defaultExpiresFilter,
  };
  const combinedResult =
    await api.functional.redditPlatform.member.email_verifications.index(
      adminConnection,
      {
        body: {
          member_id: memberAuth.id,
          ...combinedFilter,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 8. Verify records match ALL date range conditions
  for (const verification of combinedResult.data) {
    const createdAt = new Date(verification.created_at).getTime();
    const expiresAt = new Date(verification.expires_at).getTime();
    TestValidator.predicate(
      "created_at matches both range conditions",
      createdAt >= new Date(combinedFilter.created_at_range.gte!).getTime() &&
        createdAt <= new Date(combinedFilter.created_at_range.lte!).getTime(),
    );
    TestValidator.predicate(
      "expires_at matches both range conditions",
      expiresAt >= new Date(combinedFilter.expires_at_range.gte).getTime() &&
        expiresAt <= new Date(combinedFilter.expires_at_range.lte).getTime(),
    );
  }
  // 9. Test empty results with non-matching date range
  const noMatchFilter = {
    created_at_range: {
      gte: new Date(Date.now() + 86400000 * 365).toISOString(), // 1 year in the future
      lte: new Date(Date.now() + 86400000 * 366).toISOString(), // 1 year + 1 day in the future
    },
  };
  const emptyResult =
    await api.functional.redditPlatform.member.email_verifications.index(
      adminConnection,
      {
        body: {
          member_id: memberAuth.id,
          ...noMatchFilter,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result when no match",
    emptyResult.data.length,
    0,
  );
  // 10. Test sorting with date range filters
  const sortedResult =
    await api.functional.redditPlatform.member.email_verifications.index(
      adminConnection,
      {
        body: {
          member_id: memberAuth.id,
          created_at_range: dateRangeFilter,
          sort: "created_at",
          direction: "DESC",
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Verify sorting order
  for (let i = 1; i < sortedResult.data.length; i++) {
    const prevCreatedAt = new Date(
      sortedResult.data[i - 1].created_at,
    ).getTime();
    const currCreatedAt = new Date(sortedResult.data[i].created_at).getTime();
    TestValidator.predicate(
      "results sorted by created_at DESC",
      prevCreatedAt >= currCreatedAt,
    );
  }
  // Test expires_at sorting
  const expiresFilterForSorting = expiresAtFilter ?? defaultExpiresFilter;
  const sortedByExpires =
    await api.functional.redditPlatform.member.email_verifications.index(
      adminConnection,
      {
        body: {
          member_id: memberAuth.id,
          expires_at_range: expiresFilterForSorting,
          sort: "expires_at",
          direction: "ASC",
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(sortedByExpires);
  // Verify sorting order
  for (let i = 1; i < sortedByExpires.data.length; i++) {
    const prevExpiresAt = new Date(
      sortedByExpires.data[i - 1].expires_at,
    ).getTime();
    const currExpiresAt = new Date(
      sortedByExpires.data[i].expires_at,
    ).getTime();
    TestValidator.predicate(
      "results sorted by expires_at ASC",
      prevExpiresAt <= currExpiresAt,
    );
  }
}
