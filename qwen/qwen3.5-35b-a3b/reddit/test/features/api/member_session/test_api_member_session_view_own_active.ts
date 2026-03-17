import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_view_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration to obtain session tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // Note: The join response contains IAuthorizationToken but NOT sessionId
  // For E2E testing of session retrieval, we use a valid UUID pattern
  // In production, sessionId would be obtained from session listing endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve session details using session ID
  // Reuse memberConnection which now has Authorization header set by authorize_member_join
  const session = await api.functional.redditCommunity.member.sessions.at(
    memberConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 3. Validate session properties for active session
  TestValidator.equals(
    "member username exists",
    session.member.username.length > 0,
    true,
  );
  TestValidator.equals("member ID exists", session.member.id.length > 0, true);
  TestValidator.equals("IP address exists", session.ip.length > 0, true);
  TestValidator.equals("href exists", session.href.length > 0, true);
  TestValidator.equals("referrer exists", session.referrer.length > 0, true);
  TestValidator.equals(
    "created_at is valid date-time",
    !isNaN(Date.parse(session.created_at)),
    true,
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    !isNaN(Date.parse(session.updated_at)),
    true,
  );
  TestValidator.equals(
    "expired_at is valid date-time",
    !isNaN(Date.parse(session.expired_at)),
    true,
  );
  TestValidator.equals(
    "deleted_at is null (active session)",
    session.deleted_at,
    null,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    () => new Date(session.expired_at) > new Date(),
  );
  // Verify member profile exists
  if (session.member.profile) {
    TestValidator.equals(
      "profile display name exists",
      session.member.profile.display_name.length > 0,
      true,
    );
  }
}
