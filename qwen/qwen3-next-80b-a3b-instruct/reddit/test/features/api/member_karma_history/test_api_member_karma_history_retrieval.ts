import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaHistory";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_karma_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Call the karma history API with the authenticated connection
  const karmaHistory: IPageICommunityBbsKarmaHistory.ISummary =
    await api.functional.communityBbs.member.karma.history.index(
      memberConnection,
    );
  typia.assert(karmaHistory);
  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    karmaHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    karmaHistory.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive",
    karmaHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    karmaHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    karmaHistory.pagination.pages >= 0,
  );
  // Step 4: Validate that data array exists and is an array
  TestValidator.predicate(
    "data array exists",
    Array.isArray(karmaHistory.data),
  );
  // Step 5: Validate each karma history item if data exists
  if (karmaHistory.data.length > 0) {
    // Validate each karma history item structure (no manual format validation)
    for (const item of karmaHistory.data) {
      // Properties exist with correct types (guaranteed by typia.assert)
      TestValidator.equals("id is a string", typeof item.id, "string");
      TestValidator.equals(
        "actor_id is a string",
        typeof item.actor_id,
        "string",
      );
      TestValidator.equals(
        "target_id is a string",
        typeof item.target_id,
        "string",
      );
      // Change type must be one of the valid enum values
      const validChangeTypes = [
        "upvote",
        "downvote",
        "penalty",
        "reward",
        "admin_reward",
        "admin_penalty",
        "appeal_reversal",
      ] as const;
      TestValidator.predicate(
        "change_type is valid",
        validChangeTypes.includes(item.change_type),
      );
      // Amount must be a number and not NaN
      TestValidator.equals("amount is a number", typeof item.amount, "number");
      TestValidator.predicate("amount is not NaN", !isNaN(item.amount));
      // Created_at must be a string
      TestValidator.equals(
        "created_at is a string",
        typeof item.created_at,
        "string",
      );
      // Reason must be a non-empty string
      TestValidator.equals("reason is a string", typeof item.reason, "string");
      TestValidator.predicate("reason is not empty", item.reason.length > 0);
    }
  } else {
    // If no history entries exist, that's acceptable
    TestValidator.equals("no entries is valid", karmaHistory.data.length, 0);
  }
}
