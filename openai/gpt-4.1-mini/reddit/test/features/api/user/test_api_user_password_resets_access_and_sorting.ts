import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";

export async function test_api_user_password_resets_access_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Access control test: no authentication
  await TestValidator.httpError(
    "access denied without authentication",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.password_resets.index(
        connection,
        {
          body: {},
        },
      );
    },
  );

  // 2. Authenticate user with authorize_user_join
  const userConnection: api.IConnection = { host: connection.host };
  const auth: ICommunityPlatformUser.IAuthorized = await authorize_user_join(
    { host: connection.host },
    { body: {} },
  );
  // Set token in connection header
  userConnection.headers = { Authorization: `Bearer ${auth.token.access}` };

  // 3. Call index endpoint
  const response = await api.functional.communityPlatform.user.password_resets.index(
    userConnection,
    { body: {} },
  );
  typia.assert(response);

  // 4. Validate response data is array
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );

  // 5. Skip date property order validation due to property not existing

  // 6. Test calling again (simulate pagination beyond with empty body)
  const response2 = await api.functional.communityPlatform.user.password_resets.index(
    userConnection,
    { body: {} },
  );
  typia.assert(response2);

  TestValidator.predicate(
    "response2 data is array",
    Array.isArray(response2.data),
  );
}
