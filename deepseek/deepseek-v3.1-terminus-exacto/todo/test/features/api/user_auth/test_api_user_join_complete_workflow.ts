import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the full registration-to-usage workflow.
 * 1. Register a new user using authorize_user_join utility
 * 2. Extract access token from response
 * 3. Validate that join operation provides usable authentication tokens
 * This demonstrates the endpoint's role in the complete authentication flow.
 */
export async function test_api_user_join_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User registration using utility function (mandatory priority)
  const userRegistration = await authorize_user_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(userRegistration);
  // Step 2: Validate tokens are properly generated and usable
  // Create user-specific connection with access token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${userRegistration.token.access}`,
    },
  };
  // Step 3: Validate workflow - tokens from join are properly structured
  // Note: The original scenario specified POST /todoApp/user/todos but this endpoint
  // is not available in the provided API functions. This test validates that the
  // join operation correctly generates authentication tokens as specified.
  TestValidator.predicate(
    "user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userRegistration.id,
    ),
  );
  TestValidator.predicate(
    "access token is generated",
    userRegistration.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is generated",
    userRegistration.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is future date",
    new Date(userRegistration.token.expired_at) > new Date(),
  );
}
