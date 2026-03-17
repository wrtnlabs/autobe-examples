import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_with_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate test data with display name
  const displayName: string & tags.MinLength<1> & tags.MaxLength<100> =
    RandomGenerator.name();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = RandomGenerator.alphaNumeric(16);
  // Register guest with display name using utility function
  const authorized: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email,
        password,
        display_name: displayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IMultiUserTodoGuest.IJoin,
    });
  // Validate response type
  typia.assert(authorized);
  // Validate display name matches input
  TestValidator.equals(
    "display name matches input",
    authorized.display_name,
    displayName,
  );
  // Validate email matches input
  TestValidator.equals("email matches input", authorized.email, email);
  // Validate token exists
  TestValidator.predicate(
    "has access token",
    authorized.token.access !== undefined,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh !== undefined,
  );
}
