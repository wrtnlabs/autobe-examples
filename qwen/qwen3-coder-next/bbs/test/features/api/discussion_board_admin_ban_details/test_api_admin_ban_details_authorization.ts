import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_ban_details_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: adminCredentials,
  });
  // Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Setup regular member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.IJoin;
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: memberCredentials,
  });
  // Login as member
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.login(
    memberLoginConnection,
    {
      body: {
        email: memberCredentials.email,
        password: memberCredentials.password,
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  // Generate a random user ID for testing (ban details may or may not exist)
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Admin should be able to access ban details (regardless of whether ban exists)
  // The important authorization check is that admin role is accepted
  const adminResult =
    await api.functional.discussionBoard.admin.bans.details.at(
      adminLoginConnection,
      {
        userId: testUserId,
      },
    );
  typia.assert(adminResult);
  // Test 2: Regular member should be rejected from accessing admin endpoint
  await TestValidator.error(
    "member should not be authorized to access admin ban details",
    async () => {
      await api.functional.discussionBoard.admin.bans.details.at(
        memberLoginConnection,
        {
          userId: testUserId,
        },
      );
    },
  );
  // Test 3: Unauthorized access should fail
  const publicConnection: api.IConnection = { host: connection.host };
  publicConnection.headers = {};
  await TestValidator.error(
    "unauthorized user should not be authorized to access ban details",
    async () => {
      await api.functional.discussionBoard.admin.bans.details.at(
        publicConnection,
        {
          userId: testUserId,
        },
      );
    },
  );
}
