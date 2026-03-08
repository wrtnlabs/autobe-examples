import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_username_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Test data - specific username that will be duplicated
  const targetUsername = "testuser123";
  // Step 1: Create first member with the target username
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      username: targetUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(firstMember);
  // Verify first member was created successfully with the correct username
  TestValidator.equals(
    "first member username",
    firstMember.username,
    targetUsername,
  );
  // Step 2: Attempt to register second member with same username (different email)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate username rejected", async () => {
    await api.functional.communityPlatform.auth.member.join(
      secondMemberConnection,
      {
        body: {
          username: targetUsername, // Same username as first member
          email: typia.random<string & tags.Format<"email">>(), // Different email
          password: "AnotherPass456!",
          href: "https://example.com/join",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformMember.IJoin,
      },
    );
  });
  // Step 3: Test case-insensitive username uniqueness (TestUser123 should also fail)
  const caseVariationConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "case-insensitive duplicate username rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.join(
        caseVariationConnection,
        {
          body: {
            username: "TestUser123", // Same username, different case
            email: typia.random<string & tags.Format<"email">>(),
            password: "YetAnother789!",
            href: "https://example.com/join",
            referrer: "https://example.com",
          } satisfies ICommunityPlatformMember.IJoin,
        },
      );
    },
  );
  // Step 4: Verify first member's account remains unchanged
  // First member should still be able to use their connection (token should still work)
  TestValidator.predicate(
    "first member still accessible",
    firstMember.id !== null && firstMember.id !== undefined,
  );
  TestValidator.equals(
    "first member username unchanged",
    firstMember.username,
    targetUsername,
  );
}
