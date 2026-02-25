import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the user registration
  const userConnection: api.IConnection = { host: connection.host };
  // Use the utility function to register a new user
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Validate the response structure using typia.assert (complete validation)
  typia.assert(authorizedUser);
  // Test business logic only - no type validation after typia.assert()
  TestValidator.equals("initial karma should be zero", authorizedUser.karma, 0);
  TestValidator.equals(
    "email should be unverified initially",
    authorizedUser.email_verified,
    false,
  );
  TestValidator.equals(
    "created and updated timestamps should match initially",
    authorizedUser.created_at,
    authorizedUser.updated_at,
  );
  // Verify the connection headers were updated with the access token
  TestValidator.predicate(
    "connection should have authorization header",
    userConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header should match access token",
    userConnection.headers?.Authorization,
    authorizedUser.token.access,
  );
}
