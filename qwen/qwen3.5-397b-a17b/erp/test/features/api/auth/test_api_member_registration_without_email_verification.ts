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

export async function test_api_member_registration_without_email_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // Register new member - this grants immediate access without email verification
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: email,
        password: password,
        display_name: displayName,
        avatar_image: typia.random<string & tags.Format<"uri">>(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  // Validate complete response structure including all type constraints
  typia.assert(authorized);
  // Verify member identity fields match registration input (business logic validation)
  TestValidator.equals(
    "member email matches registration",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "display name matches registration",
    authorized.display_name,
    displayName,
  );
  TestValidator.equals(
    "account is active (not deleted)",
    authorized.deleted_at,
    null,
  );
  // Verify authentication tokens are returned immediately (validates no email verification block)
  const now = new Date();
  const accessExpiry = new Date(authorized.token.expired_at);
  const refreshDeadline = new Date(authorized.token.refreshable_until);
  TestValidator.predicate("access token expires in future", accessExpiry > now);
  TestValidator.predicate(
    "refresh deadline is in future",
    refreshDeadline > now,
  );
  TestValidator.predicate(
    "refresh deadline extends beyond access expiry",
    refreshDeadline >= accessExpiry,
  );
}
