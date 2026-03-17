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

export async function test_api_owner_login_failure_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a guaranteed non-existent email using UUID
  const nonExistentEmail = `nonexistent_${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  // Attempt login with non-existent email - should return 401 Unauthorized with generic error
  await TestValidator.httpError(
    "login with non-existent email should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.redditLike.auth.owner.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "ValidP@ssw0rd123", // Valid format password but wrong for non-existent user
          href: "https://example.com/login",
          referrer: "https://example.com",
          ip: "192.168.1.1",
        } satisfies IRedditLikeOwner.ILogin,
      });
    },
  );
}
