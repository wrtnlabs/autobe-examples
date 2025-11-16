import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_moderator_chronological_ordering(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authentication
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account to generate karma history
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Retrieve karma history for the member with moderator authorization
  const karmaHistoryResponse: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.members.karmaHistory.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(karmaHistoryResponse);

  // 4. Validate that pagination metadata exists
  TestValidator.predicate(
    "pagination metadata should exist",
    karmaHistoryResponse.pagination !== null &&
      karmaHistoryResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "karma history data array should exist",
    Array.isArray(karmaHistoryResponse.data),
  );

  // 5. Validate chronological ordering (newest first)
  if (karmaHistoryResponse.data.length > 1) {
    for (let i = 0; i < karmaHistoryResponse.data.length - 1; i++) {
      const current = karmaHistoryResponse.data[i];
      const next = karmaHistoryResponse.data[i + 1];

      // Each record should have a created_at timestamp
      TestValidator.predicate(
        `karma history record ${i} should have created_at timestamp`,
        current.created_at !== null && current.created_at !== undefined,
      );

      // Records should be in reverse chronological order
      const currentTimestamp = new Date(current.created_at).getTime();
      const nextTimestamp = new Date(next.created_at).getTime();

      TestValidator.predicate(
        `karma history should be in reverse chronological order: record ${i} >= record ${i + 1}`,
        currentTimestamp >= nextTimestamp,
      );
    }
  }

  // 6. Validate audit trail integrity - verify immutable fields
  for (const record of karmaHistoryResponse.data) {
    typia.assert(record);

    // Verify required fields for audit trail
    TestValidator.predicate(
      "karma history record should have id",
      record.id !== null && record.id !== undefined,
    );
    TestValidator.predicate(
      "karma history record should have member",
      record.member !== null && record.member !== undefined,
    );
    TestValidator.predicate(
      "karma history record should have change_reason",
      record.change_reason !== null && record.change_reason !== undefined,
    );
    TestValidator.predicate(
      "karma history record should have karma_change",
      record.karma_change !== null && record.karma_change !== undefined,
    );
    TestValidator.predicate(
      "karma history record should have previous_total",
      record.previous_total !== null && record.previous_total !== undefined,
    );
    TestValidator.predicate(
      "karma history record should have new_total",
      record.new_total !== null && record.new_total !== undefined,
    );

    // Verify karma calculation integrity
    const expectedNewTotal = record.previous_total + record.karma_change;
    TestValidator.equals(
      "karma new_total should equal previous_total + karma_change",
      record.new_total,
      expectedNewTotal,
    );

    // Verify karma never goes below 0
    TestValidator.predicate(
      "karma new_total should never be negative",
      record.new_total >= 0,
    );
    TestValidator.predicate(
      "karma previous_total should never be negative",
      record.previous_total >= 0,
    );
  }

  // 7. Verify member information in records
  if (karmaHistoryResponse.data.length > 0) {
    for (const record of karmaHistoryResponse.data) {
      TestValidator.equals(
        "karma history record member id should match requested member",
        record.member.id,
        member.id,
      );
    }
  }

  // 8. Validate pagination consistency
  TestValidator.predicate(
    "pagination current page should be non-negative",
    karmaHistoryResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    karmaHistoryResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    karmaHistoryResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    karmaHistoryResponse.pagination.pages >= 0,
  );

  // Verify data array length matches pagination constraints
  TestValidator.predicate(
    "returned data length should not exceed limit",
    karmaHistoryResponse.data.length <= karmaHistoryResponse.pagination.limit,
  );
}
