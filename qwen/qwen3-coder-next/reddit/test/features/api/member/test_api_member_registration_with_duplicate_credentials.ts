import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_duplicate_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. First registration - create a member
  const memberConnection1: api.IConnection = { host: connection.host };
  const registeredMember1 = await authorize_member_join(memberConnection1, {
    body: {
      email: "duplicate@test.com",
      password: "SecurePass123!",
      username: "testuser123",
      displayName: null,
      href: "https://example.com/profile1",
      referrer: "https://example.com/referrer1",
    },
  });
  typia.assert(registeredMember1);
  // 2. Second registration with same email - should fail
  await TestValidator.error("duplicate email constraint", async () => {
    await authorize_member_join(connection, {
      body: {
        email: "duplicate@test.com",
        password: "DifferentPass123!",
        username: "differentuser456",
        displayName: null,
        href: "https://example.com/profile2",
        referrer: "https://example.com/referrer2",
      },
    });
  });
  // 3. Third registration with same username - should fail
  await TestValidator.error("duplicate username constraint", async () => {
    await authorize_member_join(connection, {
      body: {
        email: "newuser@test.com",
        password: "AnotherPass123!",
        username: "testuser123",
        displayName: null,
        href: "https://example.com/profile3",
        referrer: "https://example.com/referrer3",
      },
    });
  });
  // 4. Verify original member is still valid
  const currentMember = await api.functional.redditClone.auth.member.join(
    connection,
    {
      body: {
        email: "duplicate@test.com",
        password: "SecurePass123!",
        username: "testuser123",
        displayName: null,
        href: "https://example.com/profile1",
        referrer: "https://example.com/referrer1",
      },
    },
  );
  typia.assert(currentMember);
  TestValidator.equals("same user ID", currentMember.id, registeredMember1.id);
}
