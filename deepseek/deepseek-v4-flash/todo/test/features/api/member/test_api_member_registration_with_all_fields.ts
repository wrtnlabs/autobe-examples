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
 * Test member registration with all optional fields provided.
 *
 * Validates that the join endpoint accepts a complete payload with email, password, display name, session context (href, referrer), and IP address. Ensures the response structure is correct and business rules (refreshable_after > expired_at) are satisfied.
 *
 * 1. Generate registration data with random email, password, display name, and IP.
 * 2. Register the member with all fields.
 * 3. Validate response structure and business logic.
 */
export async function test_api_member_registration_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Generate registration data
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<string & tags.Format<"password">>();
  const displayName: string = RandomGenerator.name();
  const ip: string = typia.random<string & tags.Format<"ipv4">>();
  // Create a fresh connection for the member actor
  const memberConnection: api.IConnection = { host: connection.host };
  // Register with all fields provided
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email,
        password,
        display_name: displayName,
        href: "https://todoapp.com/register",
        referrer: "https://google.com",
        ip,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  // Validate business logic
  TestValidator.equals("email matches request", authorized.email, email);
  TestValidator.equals(
    "display name matches request",
    authorized.display_name,
    displayName,
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(authorized.token.refreshable_until).getTime() >
      new Date(authorized.token.expired_at).getTime(),
  );
}
