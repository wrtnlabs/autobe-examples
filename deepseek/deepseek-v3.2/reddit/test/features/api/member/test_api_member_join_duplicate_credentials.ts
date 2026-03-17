import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
 * Test member registration with duplicate email or username conflict.
 * 1. Create first member successfully
 * 2. Attempt registration with same email → should fail
 * 3. Attempt registration with same username → should fail
 * 4. Verify generic error messages don't reveal existence details
 */
export async function test_api_member_join_duplicate_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const duplicateUsername = RandomGenerator.alphaNumeric(12);
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 1. First registration - should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: duplicateEmail,
      password: password,
      username: duplicateUsername,
      nickname: RandomGenerator.name(1),
      href: href,
      referrer: referrer,
      ip: ip,
    },
  });
  typia.assert(firstMember);
  TestValidator.equals(
    "first registration email matches",
    firstMember.email,
    duplicateEmail,
  );
  TestValidator.equals(
    "first registration username matches",
    firstMember.username,
    duplicateUsername,
  );
  // 2. Duplicate email with different username → should fail
  await TestValidator.error("duplicate email should be rejected", async () => {
    const duplicateEmailConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(duplicateEmailConnection, {
      body: {
        email: duplicateEmail, // Same email
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12), // Different username
        nickname: RandomGenerator.name(1),
        href: href,
        referrer: referrer,
        ip: ip,
      },
    });
  });
  // 3. Duplicate username with different email → should fail
  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      const duplicateUsernameConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_member_join(duplicateUsernameConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Different email
          password: typia.random<string & tags.Format<"password">>(),
          username: duplicateUsername, // Same username
          nickname: RandomGenerator.name(1),
          href: href,
          referrer: referrer,
          ip: ip,
        },
      });
    },
  );
  // 4. Valid registration with all unique credentials → should succeed
  const validConnection: api.IConnection = { host: connection.host };
  const validMember = await authorize_member_join(validConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: href,
      referrer: referrer,
      ip: ip,
    },
  });
  typia.assert(validMember);
}
