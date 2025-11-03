import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_update_profile_by_owner(
  connection: api.IConnection,
) {
  // 1) Create a new community member (self-join) and obtain authorization
  const email = typia.random<string & tags.Format<"email">>();
  const username = `testuser_${RandomGenerator.alphaNumeric(6)}`; // meets pattern ^[A-Za-z0-9_-]{3,21}$
  const createBody = {
    email,
    username,
    password: "Passw0rd!",
    display_name: RandomGenerator.name(),
    session_context: {
      href: "https://example.test/welcome",
      referrer: "https://example.test/landing",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Extract the created member summary for subsequent operations
  const member = authorized.member;
  typia.assert(member);

  // Basic sanity checks on created member
  TestValidator.equals(
    "created member username matches request",
    member.username,
    username,
  );
  TestValidator.equals(
    "created member id is present",
    typeof member.id === "string" ? member.id : null,
    member.id,
  );

  // 2) Owner updates their profile: change display_name and disable/enable mfa
  const newDisplayName = RandomGenerator.name();
  const updateBody = {
    display_name: newDisplayName,
    mfa_enabled: false,
  } satisfies ICommunityBbsCommunityMember.IUpdate;

  const updated: ICommunityBbsCommunityMember.ISummary =
    await api.functional.communityBbs.communityMember.communityMembers.update(
      connection,
      {
        username: member.username,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Business-level assertions
  TestValidator.equals(
    "display_name is updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "member id unchanged after update",
    updated.id,
    member.id,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updated.created_at,
    member.created_at,
  );
  TestValidator.predicate(
    "updated_at advanced after modification",
    new Date(updated.updated_at) > new Date(member.updated_at),
  );

  // Note: Further checks such as audit-log entry creation, session revocation,
  // or explicit email re-verification flags require administrative/session
  // management endpoints that are not available in the provided SDK. Those
  // behaviors are out-of-scope for this test implementation and should be
  // validated in separate admin/session-focused suites when such endpoints are
  // available.
}
