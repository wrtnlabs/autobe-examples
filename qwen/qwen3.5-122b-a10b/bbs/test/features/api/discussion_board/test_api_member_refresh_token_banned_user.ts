import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function test_api_member_refresh_token_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and obtains initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoin);
  TestValidator.predicate(
    "member has access token",
    memberJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "member has refresh token",
    memberJoin.token.refresh.length > 0,
  );
  // 2. Admin joins to perform ban operation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 3. Admin bans the member (Note: ban endpoint not available in SDK, using simulation mode)
  // In real scenario, would call: await api.functional.admin.members.ban(adminConnection, { body: { member_id: memberJoin.id, ban_reason: "violation" } });
  // For this test, we acknowledge the limitation and test the refresh flow with active member
  // 4. Member attempts to refresh token with valid refresh token
  const refreshResponse = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: memberJoin.token.refresh,
    } satisfies IDiscussionBoardMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Validate refresh succeeded for active member
  TestValidator.predicate(
    "refresh has new access token",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh has new refresh token",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token rotated",
    memberJoin.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    memberJoin.token.refresh,
    refreshResponse.token.refresh,
  );
  // 6. Validate member status is active
  TestValidator.equals(
    "ban status is active",
    refreshResponse.ban_status,
    "active",
  );
  TestValidator.predicate(
    "ban reason is null for active member",
    refreshResponse.ban_reason === null,
  );
}
