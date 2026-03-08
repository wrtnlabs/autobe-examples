import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_rotation_and_limit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system to get initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<(string & tags.Format<"uri">)>() as string & tags.Format<"uri">,
      referrer: typia.random<(string & tags.Format<"uri">)>() as string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  let currentRefreshToken = joinResult.token.refresh;
  const refreshResults: IEcommerceMallAdmin.IAuthorized[] = [];
  // 2. Perform 10 refresh operations (should all succeed)
  for (let i = 0; i < 10; i++) {
    const adminRefreshConnection: api.IConnection = { host: connection.host };
    const refreshResponse = await authorize_admin_refresh(
      adminRefreshConnection,
      {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies IEcommerceMallAdmin.IRefresh,
      },
    );
    typia.assert(refreshResponse);
    refreshResults.push(refreshResponse);
    // Update refresh token for next iteration
    currentRefreshToken = refreshResponse.token.refresh;
    // Validate refresh token rotation
    if (i > 0) {
      TestValidator.notEquals(
        "refresh token rotated",
        refreshResults[i - 1].token.refresh,
        refreshResponse.token.refresh,
      );
    }
    // Validate session extension (30 minutes from refresh time)
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
    TestValidator.predicate(
      "refreshable_until is 30 minutes ahead",
      refreshableUntil >= now && refreshableUntil <= thirtyMinutesLater,
    );
  }
  // 3. Test refresh limit - 11th refresh should fail
  await TestValidator.error("refresh limit exceeded", async () => {
    const adminRefreshConnection: api.IConnection = { host: connection.host };
    await authorize_admin_refresh(adminRefreshConnection, {
      body: {
        refresh_token: currentRefreshToken,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
  });
}