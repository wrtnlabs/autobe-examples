import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: "memberA@example.com",
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  // Step 2: Create Member B account (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: "memberB@example.com",
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // Step 3: Member A queries the members endpoint
  // Even with filters, Member A should only see their own record
  const memberAPagination = await api.functional.multiUserTodo.members.index(
    memberAConnection,
    {
      body: {} satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(memberAPagination);
  // Step 4: Verify privacy isolation - only Member A's data should be returned
  TestValidator.equals(
    "privacy: single member returned",
    memberAPagination.data.length,
    1,
  );
  const returnedMember = memberAPagination.data[0];
  typia.assert(returnedMember);
  TestValidator.equals(
    "privacy: email matches authenticated member",
    returnedMember.email,
    memberA.email,
  );
  TestValidator.equals(
    "privacy: ID matches authenticated member",
    returnedMember.id,
    memberA.id,
  );
  // Step 5: Test with status filter - should still only see own data
  const memberAActive = await api.functional.multiUserTodo.members.index(
    memberAConnection,
    {
      body: { status: "active" } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(memberAActive);
  TestValidator.equals(
    "privacy: single member with status filter",
    memberAActive.data.length,
    1,
  );
  TestValidator.equals(
    "privacy: email matches with status filter",
    memberAActive.data[0].email,
    memberA.email,
  );
  // Step 6: Test with date filter - should still only see own data
  const memberADateFilter = await api.functional.multiUserTodo.members.index(
    memberAConnection,
    {
      body: {
        created_at: "2024-01-01",
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(memberADateFilter);
  TestValidator.equals(
    "privacy: single member with date filter",
    memberADateFilter.data.length,
    1,
  );
  TestValidator.equals(
    "privacy: email matches with date filter",
    memberADateFilter.data[0].email,
    memberA.email,
  );
  // Step 7: Verify Member B cannot access Member A's data (test from Member B side)
  const memberBPagination = await api.functional.multiUserTodo.members.index(
    memberBConnection,
    {
      body: {} satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(memberBPagination);
  TestValidator.equals(
    "privacy: member B only sees own data",
    memberBPagination.data.length,
    1,
  );
  TestValidator.equals(
    "privacy: member B email matches",
    memberBPagination.data[0].email,
    memberB.email,
  );
}
