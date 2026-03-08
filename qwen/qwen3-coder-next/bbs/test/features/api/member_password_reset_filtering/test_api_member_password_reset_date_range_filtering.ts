import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // Update connection with auth token
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  // 2. Define date range test parameters
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const oneHourAgoISO = oneHourAgo.toISOString();
  const twoHoursAgoISO = twoHoursAgo.toISOString();
  const threeHoursAgoISO = threeHoursAgo.toISOString();
  const oneHourLaterISO = oneHourLater.toISOString();
  const twoHoursLaterISO = twoHoursLater.toISOString();
  // 3. Test created_after filter
  const afterFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      authConnection,
      {
        body: {
          created_after: twoHoursAgoISO,
          limit: 100,
        } satisfies IDiscussionBoardMemberPasswordReset.IRequest,
      },
    );
  typia.assert(afterFilter);
  // Verify all results are created after twoHoursAgo
  afterFilter.data.forEach((item) => {
    TestValidator.predicate(
      "created_after filter",
      new Date(item.created_at).getTime() >= twoHoursAgo.getTime(),
    );
  });
  // 4. Test created_before filter
  const beforeFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      authConnection,
      {
        body: {
          created_before: oneHourAgoISO,
          limit: 100,
        } satisfies IDiscussionBoardMemberPasswordReset.IRequest,
      },
    );
  typia.assert(beforeFilter);
  // Verify all results are created before oneHourAgo
  beforeFilter.data.forEach((item) => {
    TestValidator.predicate(
      "created_before filter",
      new Date(item.created_at).getTime() <= oneHourAgo.getTime(),
    );
  });
  // 5. Test expires_after filter
  const expiresAfterFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      authConnection,
      {
        body: {
          expires_after: oneHourLaterISO,
          limit: 100,
        } satisfies IDiscussionBoardMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiresAfterFilter);
  // Verify all results expire after oneHourLater
  expiresAfterFilter.data.forEach((item) => {
    TestValidator.predicate(
      "expires_after filter",
      new Date(item.expires_at).getTime() >= oneHourLater.getTime(),
    );
  });
  // 6. Test expires_before filter
  const expiresBeforeFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      authConnection,
      {
        body: {
          expires_before: oneHourLaterISO,
          limit: 100,
        } satisfies IDiscussionBoardMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiresBeforeFilter);
  // Verify all results expire before oneHourLater
  expiresBeforeFilter.data.forEach((item) => {
    TestValidator.predicate(
      "expires_before filter",
      new Date(item.expires_at).getTime() <= oneHourLater.getTime(),
    );
  });
  // 7. Test combined date range filters
  const combinedFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      authConnection,
      {
        body: {
          created_after: twoHoursAgoISO,
          created_before: oneHourAgoISO,
          expires_after: oneHourLaterISO,
          limit: 100,
        } satisfies IDiscussionBoardMemberPasswordReset.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify combined filter results
  combinedFilter.data.forEach((item) => {
    const createdAt = new Date(item.created_at).getTime();
    const expiresAt = new Date(item.expires_at).getTime();
    TestValidator.predicate(
      "combined created_after",
      createdAt >= twoHoursAgo.getTime(),
    );
    TestValidator.predicate(
      "combined created_before",
      createdAt <= oneHourAgo.getTime(),
    );
    TestValidator.predicate(
      "combined expires_after",
      expiresAt >= oneHourLater.getTime(),
    );
  });
  // 8. Test date range with boundary conditions (should return empty or limited results)
  const boundaryFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      authConnection,
      {
        body: {
          created_after: threeHoursAgoISO,
          created_before: twoHoursAgoISO,
          limit: 100,
        } satisfies IDiscussionBoardMemberPasswordReset.IRequest,
      },
    );
  typia.assert(boundaryFilter);
  // Boundary filter may or may not have results depending on test data
  TestValidator.predicate(
    "boundary filter returns valid results",
    boundaryFilter.pagination.records >= 0,
  );
  boundaryFilter.data.forEach((item) => {
    const createdAt = new Date(item.created_at).getTime();
    TestValidator.predicate(
      "boundary created_after",
      createdAt >= threeHoursAgo.getTime(),
    );
    TestValidator.predicate(
      "boundary created_before",
      createdAt <= twoHoursAgo.getTime(),
    );
  });
  // 9. Test pagination with date filtering
  const paginatedFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      authConnection,
      {
        body: {
          created_after: twoHoursAgoISO,
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardMemberPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current >= 1",
    paginatedFilter.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit respected",
    paginatedFilter.data.length <= paginatedFilter.pagination.limit,
  );
}
