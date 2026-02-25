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

export async function test_api_member_session_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing (join creates initial session)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Verify member has at least one session after login
  const output = await api.functional.discussionBoard.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMemberSession.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(output);
  // 4. Validate pagination structure
  TestValidator.equals("has pagination", output.pagination !== undefined, true);
  TestValidator.predicate("current page >= 1", output.pagination.current >= 1);
  TestValidator.predicate("limit > 0", output.pagination.limit > 0);
  TestValidator.predicate("records >= 0", output.pagination.records >= 0);
  // 5. Validate session data structure
  TestValidator.predicate("has session data", output.data !== undefined);
  TestValidator.predicate(
    "member has at least one session",
    output.data !== undefined && output.data.length > 0,
  );
  if (output.data && output.data.length > 0) {
    // 6. Validate first session structure
    const session = output.data[0];
    TestValidator.equals("session has id", session.id !== undefined, true);
    TestValidator.equals(
      "session has member info",
      session.member !== undefined,
      true,
    );
    TestValidator.equals(
      "session has expiredAt",
      session.expiredAt !== undefined,
      true,
    );
    TestValidator.equals(
      "session has createdAt",
      session.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "session has updatedAt",
      session.updatedAt !== undefined,
      true,
    );
    TestValidator.equals(
      "session has lastActiveAt",
      session.lastActiveAt !== undefined,
      true,
    );
    TestValidator.equals("session has ip", session.ip !== undefined, true);
    TestValidator.equals(
      "session has headers",
      session.headers !== undefined,
      true,
    );
    // 7. Validate member summary structure (no sensitive data)
    const member = session.member;
    TestValidator.equals("member has id", member.id !== undefined, true);
    TestValidator.equals("member has email", member.email !== undefined, true);
    TestValidator.equals(
      "member has display_name",
      member.display_name !== undefined,
      true,
    );
    TestValidator.equals(
      "member has is_active",
      member.is_active !== undefined,
      true,
    );
    TestValidator.equals(
      "member has is_admin",
      member.is_admin !== undefined,
      true,
    );
    TestValidator.equals(
      "member has is_super_admin",
      member.is_super_admin !== undefined,
      true,
    );
    TestValidator.equals(
      "member has created_at",
      member.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "member has updated_at",
      member.updated_at !== undefined,
      true,
    );
    // 8. Verify no sensitive data exposed (no token fields)
    const sessionKeys = Object.keys(session);
    const tokenFieldPresent = sessionKeys.some(
      (key) =>
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("refresh") ||
        key.toLowerCase().includes("access"),
    );
    TestValidator.equals(
      "no sensitive token data exposed",
      tokenFieldPresent,
      false,
    );
  }
}
