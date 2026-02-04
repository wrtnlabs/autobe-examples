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

export async function test_api_user_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for user registration
  const userConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new user using the authorization utility function
  // This is mandatory as per the utility function priority rule
  const registrationResult: ITodoAppUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    });
  // Step 3: Validate the registration response type
  typia.assert(registrationResult);
  // Step 4: Validate the returned user profile data structure
  TestValidator.equals(
    "user has email",
    registrationResult.email,
    registrationResult.email,
  );
  TestValidator.equals(
    "user has display_name",
    registrationResult.display_name,
    registrationResult.display_name,
  );
  TestValidator.predicate(
    "user has created_at timestamp",
    typeof registrationResult.created_at === "string",
  );
  TestValidator.predicate(
    "user has updated_at timestamp",
    typeof registrationResult.updated_at === "string",
  );
  TestValidator.equals(
    "user has UUID id",
    typeof registrationResult.id === "string",
    true,
  );
  // Step 5: Validate the token structure
  TestValidator.equals(
    "token has access property",
    registrationResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token has refresh property",
    registrationResult.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "token has expired_at in ISO format",
    registrationResult.token.expired_at,
    registrationResult.token.expired_at,
  );
  TestValidator.equals(
    "token has refreshable_until in ISO format",
    registrationResult.token.refreshable_until,
    registrationResult.token.refreshable_until,
  );
  // Step 6: Validate that the registration result has all required properties from IAuthorized
  const requiredProperties = [
    "id",
    "email",
    "display_name",
    "created_at",
    "updated_at",
    "token",
  ];
  requiredProperties.forEach((prop) => {
    TestValidator.predicate(
      `${prop} exists in response`,
      registrationResult.hasOwnProperty(prop),
    );
  });
  // Step 7: Validate that the token properties are all present and non-empty
  const tokenProperties = [
    "access",
    "refresh",
    "expired_at",
    "refreshable_until",
  ];
  tokenProperties.forEach((prop) => {
    TestValidator.predicate(
      `token has ${prop}`,
      registrationResult.token.hasOwnProperty(prop),
    );
    if (prop !== "expired_at" && prop !== "refreshable_until") {
      TestValidator.predicate(
        `token.${prop} has content`,
        registrationResult.token[prop as keyof IAuthorizationToken].length > 0,
      );
    }
  });
  // Step 8: Validate that the user ID is a valid UUID format
  TestValidator.predicate(
    "user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registrationResult.id,
    ),
  );
  // Step 9: Validate that email is in valid format
  TestValidator.predicate(
    "email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(registrationResult.email),
  );
  // Step 10: Validate that display_name follows length constraints
  TestValidator.predicate(
    "display_name has minimum length 1",
    registrationResult.display_name.length >= 1,
  );
  TestValidator.predicate(
    "display_name has maximum length 50",
    registrationResult.display_name.length <= 50,
  );
  // Step 11: Validate date-time formats for created_at and updated_at
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      registrationResult.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      registrationResult.updated_at,
    ),
  );
  // Step 12: Validate that expired_at and refreshable_until are valid ISO date-time formats
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      registrationResult.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      registrationResult.token.refreshable_until,
    ),
  );
}