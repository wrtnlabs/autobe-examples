import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_join_optional_bio_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection that doesn't have any authorization headers initially
  const registeredUserConnection: api.IConnection = { host: connection.host };
  // Construct minimum required join body omitting optional bio
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  // Use the utility function for join with required minimum fields
  const authorized = await authorize_registered_user_join(
    registeredUserConnection,
    { body },
  );
  // Validate the response type fully
  typia.assert(authorized);
  // Validate token presence and property types
  TestValidator.predicate(
    "token has access",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );
}
