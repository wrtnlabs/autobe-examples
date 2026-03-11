import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can successfully retrieve detailed information about their own authentication session.
 *
 * This test validates the session retrieval workflow:
 * 1. Registers a new member account using authorize_member_join utility
 * 2. Creates member-specific connection with authentication token
 * 3. Retrieves session details using GET /discussionBoard/member/sessions/{sessionId}
 * 4. Validates all required session fields are present and correctly typed
 * 5. Verifies session ownership by matching member.id with authenticated member
 */
export async function test_api_member_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate session ID for retrieval test
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve session details using member's authenticated connection
  const session = await api.functional.discussionBoard.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session ownership - member.id must match authenticated member's id
  TestValidator.equals(
    "session member id matches authenticated member",
    session.member.id,
    authorized.id,
  );
}
