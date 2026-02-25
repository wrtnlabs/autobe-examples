import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_with_valid_name(
  unusedParam: any, 
  connection: api.IConnection,
): Promise<void> { 
  // Step 1: Create authenticated user context using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  
  // Create new connection with authorization token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  
  // Step 2: Update display name with valid new name
  const newDisplayName = RandomGenerator.name();
  const updateResponse = await api.functional.todoApp.user.users.profile.update(
    authenticatedConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updateResponse);
  
  // Step 3: Validate the display name update
  TestValidator.equals(
    "display name should be updated",
    updateResponse.display_name,
    newDisplayName,
  );
  
  // Step 4: Validate that email remains unchanged
  TestValidator.equals(
    "email should remain the same",
    updateResponse.email,
    authorizedUser.email,
  );
  
  // Step 5: Validate that user ID remains unchanged
  TestValidator.equals(
    "user ID should remain the same",
    updateResponse.id,
    authorizedUser.id,
  );
  
  // Step 6: Validate that creation timestamp remains consistent
  TestValidator.equals(
    "creation timestamp should remain consistent",
    updateResponse.created_at,
    authorizedUser.created_at,
  );
  
  // Step 7: Validate that update timestamp is newer than creation timestamp
  TestValidator.predicate(
    "update timestamp should be after creation timestamp",
    new Date(updateResponse.updated_at) > new Date(authorizedUser.created_at),
  );
  
  // Step 8: Validate that deleted_at remains null
  TestValidator.equals(
    "deleted_at should remain null",
    updateResponse.deleted_at,
    null,
  );
}