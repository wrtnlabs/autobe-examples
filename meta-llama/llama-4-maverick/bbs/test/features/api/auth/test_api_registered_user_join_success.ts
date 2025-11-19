import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_registered_user_join_success(
  connection: api.IConnection,
) {
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const registrationResponse = await api.functional.auth.registered_user.join(
    connection,
    {
      body: randomEmail satisfies IDiscussionBoardRegisteredUser.ICreate,
    },
  );
  typia.assert(registrationResponse);

  TestValidator.equals(
    "registration response email matches",
    registrationResponse.email,
    randomEmail,
  );

  TestValidator.predicate(
    "authorization token is valid",
    registrationResponse.token.access.length > 0 &&
      registrationResponse.token.refresh.length > 0 &&
      new Date(registrationResponse.token.expired_at).getTime() > Date.now() &&
      new Date(registrationResponse.token.refreshable_until).getTime() >
        Date.now(),
  );
}
