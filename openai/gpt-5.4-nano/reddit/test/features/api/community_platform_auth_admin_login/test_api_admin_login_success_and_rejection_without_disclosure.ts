import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success_and_rejection_without_disclosure(
  connection: api.IConnection,
): Promise<void> {
  const adminConnectionBase: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: joinPassword satisfies string & tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminJoined = await authorize_admin_join(adminConnectionBase, {
    body: adminJoinInput satisfies DeepPartial<ICommunityPlatformAdmin.IJoin>,
  });
  typia.assert(adminJoined);
  const loginSuccessConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_login(loginSuccessConnection, {
    body: {
      email: adminJoinInput.email,
      password: adminJoinInput.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(authorized);
  typia.assert(authorized.token);
  TestValidator.predicate(
    "token contains access and refresh",
    authorized.token.access.length > 0 && authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token contains expiration fields",
    authorized.token.expired_at.length > 0 &&
      authorized.token.refreshable_until.length > 0,
  );
  const responseRecord = authorized as unknown as Record<string, unknown>;
  TestValidator.predicate(
    "response does not include password",
    responseRecord.password === undefined,
  );
  const wrongPassword = `${joinPassword}${RandomGenerator.alphaNumeric(1)}`;
  const wrongPasswordInput = wrongPassword satisfies string &
    tags.Format<"password">;
  await TestValidator.httpError(
    "wrong password rejected without disclosure",
    [401, 403],
    async () => {
      const loginWrongPasswordConnection: api.IConnection = {
        host: connection.host,
      };
      try {
        await authorize_admin_login(loginWrongPasswordConnection, {
          body: {
            email: adminJoinInput.email,
            password: wrongPasswordInput,
          } satisfies ICommunityPlatformAdmin.ILogin,
        });
      } catch (exp) {
        const err = exp as unknown as {
          toJSON?: <T>() => T;
        };
        if (typeof err.toJSON !== "function") throw exp;
        const message = err.toJSON<{ message?: string }>().message;
        const text = typeof message === "string" ? message : "";
        TestValidator.predicate(
          "error does not disclose account existence",
          !text.toLowerCase().includes(adminJoinInput.email.toLowerCase()),
        );
        TestValidator.predicate(
          "error does not disclose secrets",
          !text.toLowerCase().includes(joinPassword.toLowerCase()),
        );
        throw exp;
      }
    },
  );
  await TestValidator.httpError(
    "non-existent admin rejected without disclosure",
    [401, 403],
    async () => {
      const nonExistentEmail = typia.random<string & tags.Format<"email">>();
      const loginNonexistentConnection: api.IConnection = {
        host: connection.host,
      };
      try {
        await authorize_admin_login(loginNonexistentConnection, {
          body: {
            email: nonExistentEmail,
            password: typia.random<string & tags.Format<"password">>(),
          } satisfies ICommunityPlatformAdmin.ILogin,
        });
      } catch (exp) {
        const err = exp as unknown as {
          toJSON?: <T>() => T;
        };
        if (typeof err.toJSON !== "function") throw exp;
        const message = err.toJSON<{ message?: string }>().message;
        const text = typeof message === "string" ? message : "";
        TestValidator.predicate(
          "error does not disclose account existence",
          !text.toLowerCase().includes(nonExistentEmail.toLowerCase()),
        );
        throw exp;
      }
    },
  );
}
