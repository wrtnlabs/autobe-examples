import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Retrieve sessions with pagination
  const response = await api.functional.discussionBoard.member.sessions.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("page limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Test with different pagination parameters (page 2, limit 15)
  const page2Response =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 15,
        },
      },
    );
  typia.assert(page2Response);
  // Test with default values
  const defaultResponse =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  // Verify data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  if (response.data.length > 0) {
    typia.assert<IDiscussionBoardMemberSession.ISummary>(response.data[0]);
  }
}
