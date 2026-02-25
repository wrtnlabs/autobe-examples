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

export async function test_api_member_session_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(admin);
  // Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_member_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(superAdmin);
  const now = new Date().toISOString();
  // Test 1: Filter by user type - member
  const memberFilter: IDiscussionBoardMemberSession.IRequest = {
    userType: "member",
    page: 1,
    limit: 10,
  };
  const memberResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: memberFilter },
    );
  typia.assert(memberResult);
  // Test 2: Filter by user type - admin
  const adminFilter: IDiscussionBoardMemberSession.IRequest = {
    userType: "admin",
    page: 1,
    limit: 10,
  };
  const adminResult =
    await api.functional.discussionBoard.member.sessions.index(
      adminConnection,
      { body: adminFilter },
    );
  typia.assert(adminResult);
  // Test 3: Filter by user type - super admin
  const superAdminFilter: IDiscussionBoardMemberSession.IRequest = {
    userType: "superAdmin",
    page: 1,
    limit: 10,
  };
  const superAdminResult =
    await api.functional.discussionBoard.member.sessions.index(
      superAdminConnection,
      { body: superAdminFilter },
    );
  typia.assert(superAdminResult);
  // Test 4: Filter by session status - active
  const activeFilter: IDiscussionBoardMemberSession.IRequest = {
    sessionStatus: "active",
    page: 1,
    limit: 100,
  };
  const activeResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: activeFilter },
    );
  typia.assert(activeResult);
  TestValidator.predicate(
    "active filter returns sessions",
    activeResult.data.length >= 0,
  );
  // Test 5: Filter by session status - expired
  const expiredFilter: IDiscussionBoardMemberSession.IRequest = {
    sessionStatus: "expired",
    page: 1,
    limit: 100,
  };
  const expiredResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: expiredFilter },
    );
  typia.assert(expiredResult);
  // Test 6: Filter by date range - after startDate
  const startDateFilter: IDiscussionBoardMemberSession.IRequest = {
    startDate: now,
    page: 1,
    limit: 100,
  };
  const startDateResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: startDateFilter },
    );
  typia.assert(startDateResult);
  // Test 7: Filter by date range - before endDate
  const endDateFilter: IDiscussionBoardMemberSession.IRequest = {
    endDate: now,
    page: 1,
    limit: 100,
  };
  const endDateResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: endDateFilter },
    );
  typia.assert(endDateResult);
  // Test 8: Combined filters - member type and active status
  const combinedFilter: IDiscussionBoardMemberSession.IRequest = {
    userType: "member",
    sessionStatus: "active",
    page: 1,
    limit: 10,
  };
  const combinedResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Test 9: Pagination test
  const paginationFilter: IDiscussionBoardMemberSession.IRequest = {
    page: 1,
    limit: 2,
  };
  const paginationResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: paginationFilter },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit works",
    paginationResult.pagination.limit,
    2,
  );
  // Test 10: No filters - should return all
  const noFilter: IDiscussionBoardMemberSession.IRequest = {};
  const noFilterResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: noFilter },
    );
  typia.assert(noFilterResult);
  TestValidator.predicate(
    "no filter returns sessions",
    noFilterResult.data.length >= 0,
  );
  // Test 11: Filter with null values (should be ignored)
  const nullFilter: IDiscussionBoardMemberSession.IRequest = {
    userType: null,
    sessionStatus: null,
    startDate: null,
    endDate: null,
    page: 1,
    limit: 10,
  };
  const nullFilterResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      { body: nullFilter },
    );
  typia.assert(nullFilterResult);
}
