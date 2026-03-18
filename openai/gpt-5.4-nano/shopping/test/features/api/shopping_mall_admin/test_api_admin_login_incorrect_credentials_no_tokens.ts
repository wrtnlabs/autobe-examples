import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_incorrect_credentials_no_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create an existing admin account (prerequisite)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia
    .random<string & tags.Format<"email">>() satisfies string & tags.Format<
    "email"
  >;
  const adminPassword = typia
    .random<string & tags.Format<"password">>() satisfies string & tags.Format<
    "password"
  >;
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });

  // 2) Attempt login with incorrect credentials and validate 401/403 without tokens
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const incorrectPassword = (() => {
    const p = typia
      .random<string & tags.Format<"password">>() satisfies string & tags.Format<
      "password"
    >;
    return p !== adminPassword
      ? p
      : ((adminPassword + "-") as unknown as string & tags.Format<"password">);
  })();

  await TestValidator.httpError(
    "admin login with incorrect password should fail with 401/403 and not issue tokens",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.auth.admin.login(
        adminLoginConnection,
        {
          body: {
            email: adminEmail,
            password: incorrectPassword,
          } satisfies IShoppingMallAdmin.ILogin,
        },
      ),
  );

  // 3) Additional token-leak checks: ensure failure response body doesn't include tokens.
  await TestValidator.error(
    "admin login failure should not include token fields",
    async () => {
      try {
        await api.functional.shoppingMall.auth.admin.login(adminLoginConnection, {
          body: {
            email: adminEmail,
            password: incorrectPassword,
          } satisfies IShoppingMallAdmin.ILogin,
        });
        throw new Error("Expected login to fail, but it succeeded.");
      } catch (err) {
        const e = err as unknown as {
          toJSON?: <T = unknown>() => T;
        };
        const json = typeof e.toJSON === "function" ? e.toJSON<unknown>() : undefined;
        if (json == null) return;
        if (typeof json === "object" && json !== null) {
          const msgAny = (json as Record<string, unknown>).message;
          if (typeof msgAny === "object" && msgAny !== null) {
            const msg = msgAny as Record<string, unknown>;

            TestValidator.predicate(
              "error response should not contain token",
              () => !("token" in msg),
            );

            TestValidator.predicate(
              "error response should not contain token.access",
              () =>
                !("token.access" in msg) &&
                !("token" in msg && typeof (msg as any).token !== "undefined"),
            );

            if (
              "token" in msg &&
              typeof msg.token === "object" &&
              msg.token !== null
            ) {
              const token = msg.token as Record<string, unknown>;
              TestValidator.predicate(
                "token.access should be absent on failure",
                () => !("access" in token),
              );
              TestValidator.predicate(
                "token.refresh should be absent on failure",
                () => !("refresh" in token),
              );
            }
          }
        }
      }
    },
  );
}
