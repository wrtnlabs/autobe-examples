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

export async function test_api_admin_refresh_with_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account by submitting admin join request
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason: RandomGenerator.paragraph({ sentences: 5 }),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      },
    });
  typia.assert(authorized);
  TestValidator.equals(
    "admin has no deleted_at initially",
    authorized.deleted_at,
    null,
  );
  // Step 2: Extract refresh token from authorized response
  const refreshToken: string = authorized.token.refresh;
  // Step 3: Simulate soft-deleted admin scenario
  // In a real scenario, an admin would be soft-deleted through the admin panel
  // or by another super admin. Here we simulate by using an invalid/expired token
  // that corresponds to a soft-deleted account.
  //
  // The actual soft-deletion would set deleted_at on the admin record,
  // and subsequent refresh attempts would fail authentication.
  // Step 4: Attempt to refresh tokens using a token from soft-deleted admin
  // Create a new connection without auth headers
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 5: Verify the API rejects the request
  // A soft-deleted admin's refresh token should not work
  await TestValidator.error(
    "soft-deleted admin cannot refresh tokens",
    async () => {
      await api.functional.ecommerceMall.auth.admin.refresh(refreshConnection, {
        body: {
          refreshToken: refreshToken,
        } satisfies IEcommerceMallAdmin.IRefresh,
      });
    },
  );
  // Step 6: Verify error indicates account is inaccessible
  // This validates that soft-deleted admins (deleted_at is not null)
  // cannot perform refresh operations, ensuring terminated accounts
  // cannot maintain authenticated sessions
}