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

export async function test_api_member_karma_history_filter_comment_upvotes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to establish identity
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Filter karma history for comment upvotes
  const filteredResponse =
    await api.functional.community.member.karma.history.index(
      memberConnection,
      {
        body: {
          source_type: "comment",
          reason: "upvote_released",
        } satisfies ICommunityKarmaHistory.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination exists",
    filteredResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(filteredResponse.data),
    true,
  );
  TestValidator.predicate("pagination has valid values", () => {
    return (
      filteredResponse.pagination.current >= 1 &&
      filteredResponse.pagination.limit >= 1 &&
      filteredResponse.pagination.records >= 0 &&
      filteredResponse.pagination.pages >= 0
    );
  });
  // 4. Validate that response contains data items (without assuming non-existent properties)
  // Since ICommunityKarmaHistory.ISummary is an empty object {}, we can't validate specific properties
  // We just ensure the response structure is correct as per pagination schema and data is an array
  return TestValidator.predicate(
    "data array is properly formed and non-empty if records > 0",
    () => {
      // If there are records, data array should have items
      if (filteredResponse.pagination.records > 0) {
        return filteredResponse.data.length > 0;
      }
      return true; // If records is 0, data array can be empty
    },
  );
}
