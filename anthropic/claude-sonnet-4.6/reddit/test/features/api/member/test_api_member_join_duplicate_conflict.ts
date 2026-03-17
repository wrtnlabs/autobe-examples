import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first member with unique credentials
  const originalUsername = RandomGenerator.alphaNumeric(12);
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const originalHref = typia.random<string & tags.Format<"uri">>();
  const originalReferrer = typia.random<string & tags.Format<"uri">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      username: originalUsername,
      email: originalEmail,
      password: originalPassword,
      href: originalHref,
      referrer: originalReferrer,
    },
  });
  typia.assert(firstMember);
  // Verify that the registered member's email and username match what we sent
  TestValidator.equals(
    "registered email matches",
    firstMember.email,
    originalEmail,
  );
  TestValidator.equals(
    "registered username matches",
    firstMember.username,
    originalUsername,
  );
  // Step 2: Attempt duplicate email registration (different username, same email)
  await TestValidator.error("duplicate email should be rejected", async () => {
    const duplicateEmailConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(duplicateEmailConnection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: originalEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  // Step 3: Attempt duplicate username registration (same username, different email)
  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      const duplicateUsernameConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_member_join(duplicateUsernameConnection, {
        body: {
          username: originalUsername,
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
