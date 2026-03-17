import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a new owner account to obtain a valid ownerId
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  const ownerId = authorized.id;
  // Execution: Call GET /redditLike/owners/{ownerId}
  const owner = await api.functional.redditLike.owners.at(ownerConnection, {
    ownerId,
  });
  // Validation: Verify response structure and content
  typia.assert(owner);
  TestValidator.equals("ownerId matches request", owner.id, ownerId);
  TestValidator.predicate(
    "password_hash not exposed",
    () => !("password_hash" in owner) && !("password" in owner),
  );
}
