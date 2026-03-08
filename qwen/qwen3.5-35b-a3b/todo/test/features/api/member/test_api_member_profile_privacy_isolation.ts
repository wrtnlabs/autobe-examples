import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile privacy isolation.
 * Validates that users can only access their own profile data.
 */
export async function test_api_member_profile_privacy_isolation(
  connection: api.IConnection,
) {
  // 1. Create Member A account
  const memberAJoinInput = {
    email: "userA@example.com",
    password: "password123",
    displayName: "Member A",
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ITodoAppMember.IJoin;
  const memberAAuth = await authorize_member_join(connection, {
    body: memberAJoinInput,
  });
  typia.assert(memberAAuth);
  // 2. Create Member B account
  const memberBJoinInput = {
    email: "userB@example.com",
    password: "password123",
    displayName: "Member B",
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ITodoAppMember.IJoin;
  const memberBAuth = await authorize_member_join(connection, {
    body: memberBJoinInput,
  });
  typia.assert(memberBAuth);
  // 3. Create isolated connections for each member
  const memberAConnection: api.IConnection = {
    host: connection.host,
  };
  memberAConnection.headers = {
    ...memberAConnection.headers,
    Authorization: memberAAuth.token.access,
  };
  const memberBConnection: api.IConnection = {
    host: connection.host,
  };
  memberBConnection.headers = {
    ...memberBConnection.headers,
    Authorization: memberBAuth.token.access,
  };
  // 4. Member A accesses their own profile
  const memberAProfile =
    await api.functional.todoApp.member.profile.at(memberAConnection);
  typia.assert(memberAProfile);
  // 5. Member B accesses their own profile
  const memberBProfile =
    await api.functional.todoApp.member.profile.at(memberBConnection);
  typia.assert(memberBProfile);
  // 6. Validate privacy isolation
  // Member A's profile should contain their email
  TestValidator.equals(
    "member A email matches",
    memberAProfile.email,
    "userA@example.com",
  );
  // Member B's profile should contain their email, NOT member A's email
  TestValidator.equals(
    "member B email matches",
    memberBProfile.email,
    "userB@example.com",
  );
  // Verify profiles are different
  TestValidator.notEquals(
    "member profiles are different",
    memberAProfile.email,
    memberBProfile.email,
  );
}
