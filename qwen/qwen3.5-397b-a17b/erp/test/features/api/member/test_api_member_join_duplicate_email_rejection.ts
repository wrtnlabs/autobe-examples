import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test duplicate email rejection during member registration.
 *
 * This test validates that the system enforces unique email constraints
 * at the business logic layer. The scenario:
 * 1. First registration with a unique email succeeds
 * 2. Second registration with the same email is rejected with a business error
 *
 * This ensures no duplicate member accounts can be created with the same email.
 */
export async function test_api_member_join_duplicate_email_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for this test
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const commonPassword = RandomGenerator.alphaNumeric(16);
  const commonDisplayName = RandomGenerator.name();
  const commonHref = typia.random<string & tags.Format<"uri">>();
  const commonReferrer = typia.random<string & tags.Format<"uri">>();
  // First registration - should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: uniqueEmail,
      password: commonPassword,
      display_name: commonDisplayName,
      href: commonHref,
      referrer: commonReferrer,
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(firstMember);
  // Validate first registration response
  TestValidator.equals("email matches", firstMember.email, uniqueEmail);
  TestValidator.equals(
    "display name matches",
    firstMember.displayName,
    commonDisplayName,
  );
  // Second registration with same email - should fail with business logic error
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email rejection", async () => {
    await authorize_member_join(secondConnection, {
      body: {
        email: uniqueEmail, // Same email as first registration
        password: commonPassword,
        display_name: RandomGenerator.name(), // Different display name
        href: commonHref,
        referrer: commonReferrer,
        avatar_url: null,
        phone_number: null,
        ip: null,
      } satisfies IHrmPlatformMember.IJoin,
    });
  });
}
