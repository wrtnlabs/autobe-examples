import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_with_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Join as admin user to get initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth: IEconomicPoliticalBoardAdmin.IAuthorized =
    await authorize_admin_join(joinConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email">
        >() satisfies string as string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string & tags.Format<"uri">,
        referrer: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string & tags.Format<"uri">,
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    });
  typia.assert(initialAuth);
  // Capture initial refresh token
  const oldRefreshToken: string = initialAuth.token.refresh;
  // First refresh with initial token
  const refreshConnection: api.IConnection = { host: connection.host };
  const firstRefresh: IEconomicPoliticalBoardAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh_token: oldRefreshToken,
      } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
    });
  typia.assert(firstRefresh);
  // Verify rotation: new refresh token is different from old
  const newRefreshToken: string = firstRefresh.token.refresh;
  TestValidator.notEquals(
    "refresh token rotation occurred",
    oldRefreshToken,
    newRefreshToken,
  );
  // Verify old token is invalidated: attempt to use it should fail
  const invalidateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be invalidated after rotation",
    async () => {
      await authorize_admin_refresh(invalidateConnection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
      });
    },
  );
  // Verify new token works: use the new refresh token to refresh again
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefresh: IEconomicPoliticalBoardAdmin.IAuthorized =
    await authorize_admin_refresh(secondRefreshConnection, {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
    });
  typia.assert(secondRefresh);
}
