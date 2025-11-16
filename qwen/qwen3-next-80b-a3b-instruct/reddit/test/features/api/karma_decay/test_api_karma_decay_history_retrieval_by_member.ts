import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformKarmaDecayLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaDecayLog";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformKarmaDecayLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaDecayLog";

export async function test_api_karma_decay_history_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.1",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Retrieve the member's karma decay history
  const decayHistory: IPageICommunityPlatformKarmaDecayLog =
    await api.functional.communityPlatform.karma.decay.index(connection);
  typia.assert(decayHistory);

  // Step 3: Validate pagination metadata against schema constraints
  TestValidator.equals("current page should be 1", decayHistory.current, 1);
  TestValidator.predicate(
    "limit should be between 1 and 100",
    decayHistory.limit >= 1 && decayHistory.limit <= 100,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    decayHistory.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be at least 1",
    decayHistory.pages >= 1,
  );

  // Step 4: Validate that each decay record structure matches ICommunityPlatformKarmaDecayLog
  for (const record of decayHistory.data) {
    TestValidator.equals(
      "record id is a valid uuid",
      typeof record.id,
      "string",
    );
    TestValidator.equals(
      "member_id is a valid uuid",
      typeof record.member_id,
      "string",
    );
    TestValidator.predicate(
      "member_id matches authenticated member",
      record.member_id === member.id,
    );
    TestValidator.equals(
      "amount is an integer",
      typeof record.amount,
      "number",
    );
    TestValidator.predicate("amount is negative or zero", record.amount <= 0);
    TestValidator.equals("reason is a string", typeof record.reason, "string");
    TestValidator.equals(
      "created_at is in date-time format",
      typeof record.created_at,
      "string",
    );
    TestValidator.predicate(
      "admin_id is either null, uuid string, or undefined",
      record.admin_id === null ||
        (typeof record.admin_id === "string" &&
          /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
            record.admin_id,
          )),
    );
  }

  // Step 5: Validate that only the authenticated member's records are returned
  // Note: It's valid to have zero records in decay history
  const recordsForMember = decayHistory.data.filter(
    (record) => record.member_id === member.id,
  );
  TestValidator.predicate(
    "all records belong to authenticating member",
    recordsForMember.length === decayHistory.data.length,
  );
}
