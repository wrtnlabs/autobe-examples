import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_karma_history_full(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // Retrieve full karma history with default pagination
  const history = await api.functional.community.member.karma.history.index(
    memberConnection,
    {
      body: {} satisfies ICommunityKarmaHistory.IRequest,
    },
  );
  typia.assert(history);
  // Validate response structure strictly according to DTO schema
  // Since ICommunityKarmaHistory.ISummary is empty ({}), we cannot validate any properties on data items
  // We can only validate the top-level structure as defined in IPageICommunityKarmaHistory.ISummary
  TestValidator.equals(
    "pagination is object",
    typeof history.pagination,
    "object",
  );
  TestValidator.equals("data is array", Array.isArray(history.data), true);
  // Validate pagination object structure (the only defined properties)
  TestValidator.equals(
    "pagination has current property",
    "current" in history.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has limit property",
    "limit" in history.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has records property",
    "records" in history.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has pages property",
    "pages" in history.pagination,
    true,
  );
  // Validate that pagination numbers are non-negative integers as per schema
  TestValidator.predicate(
    "current is positive integer",
    Number.isInteger(history.pagination.current) &&
      history.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive integer",
    Number.isInteger(history.pagination.limit) && history.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative integer",
    Number.isInteger(history.pagination.records) &&
      history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative integer",
    Number.isInteger(history.pagination.pages) && history.pagination.pages >= 0,
  );
  // Validate that limit in pagination corresponds to what we requested
  // Default should be 20 as per scenario description, but use the returned value
  TestValidator.predicate(
    "limit is consistent with default",
    history.pagination.limit === 20,
  );
  // Enter the realm of the impossible: validating ordering of history entries
  // ICommunityKarmaHistory.ISummary is defined as {} - no properties exist
  // Therefore, we cannot validate that entries are ordered by created_at (newest first)
  // We can only assert the structure exists
  // Validate that returning no entries is a valid state (empty array)
  // The scenario doesn't specify any karma must exist, so empty is allowed
}
