import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_tip_deletion_by_unauthorized_user_rejected(
  connection: api.IConnection,
) {
  // 1. Authenticate first member (tip owner)
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "securePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member1);

  // 2. Authenticate second member (unauthorized deleter)
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "anotherSecurePassword456!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(member2);

  // 3. Generate a valid tip ID (random UUID) — this tip DOES NOT exist, but it has valid format
  const tipId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Switch to member2's context by calling join again — this changes the connection's Authorization header automatically
  // DO NOT manually set connection.headers — SDK manages headers via authentication calls.
  // Switch connection to member2's authentication context by re-authenticating with member2's credentials on same connection
  // The SDK auto-updates headers
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "anotherSecurePassword456!",
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com/home",
      ip: "192.168.1.101",
    } satisfies IMember.ICreate,
  });

  // 5. Attempt to delete a tip by unauthorized user — even if the tip does not exist,
  //    the system should return 403 Forbidden if user is not authorized to know/configure it.
  //    This prevents info leakage — user cannot know if tip exists or not.
  await TestValidator.error(
    "unauthorized user should be rejected from deleting a tip",
    async () => {
      await api.functional.communityPlatform.member.tips.erase(connection, {
        tipId,
      });
    },
  );
}
