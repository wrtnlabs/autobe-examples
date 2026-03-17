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

export async function test_api_owner_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for testing duplicate registration
  const testEmail: string = typia.random<string & tags.Format<"email">>();
  // Step 1: Create the first owner account with the test email
  const firstOwnerConnection: api.IConnection = { host: connection.host };
  const firstOwner = await authorize_owner_join(firstOwnerConnection, {
    body: {
      email: testEmail,
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(firstOwner);
  // Step 2: Attempt to register a second owner with the same email
  // This should fail with 409 Conflict
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () => {
      await authorize_owner_join(secondOwnerConnection, {
        body: {
          email: testEmail,
          password: typia.random<string & tags.Format<"password">>(),
          nickname: RandomGenerator.name(),
        } satisfies IRedditLikeOwner.IJoin,
      });
    },
  );
}
