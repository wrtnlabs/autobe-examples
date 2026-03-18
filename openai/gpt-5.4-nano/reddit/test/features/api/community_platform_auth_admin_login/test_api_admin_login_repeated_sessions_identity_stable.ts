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

export async function test_api_admin_login_repeated_sessions_identity_stable(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password">;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joined = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(joined);

  const adminLoginConnection1: api.IConnection = { host: connection.host };
  const login1 = await authorize_admin_login(adminLoginConnection1, {
    body: {
      email: joinEmail,
      password: joinPassword,
    },
  });
  typia.assert(login1);

  const adminLoginConnection2: api.IConnection = { host: connection.host };
  const login2 = await authorize_admin_login(adminLoginConnection2, {
    body: {
      email: joinEmail,
      password: joinPassword,
    },
  });
  typia.assert(login2);

  TestValidator.equals("admin id stable", login1.id, login2.id);
  TestValidator.equals("admin email stable", login1.email, login2.email);
  TestValidator.notEquals(
    "access token rotated",
    login1.token.access,
    login2.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    login1.token.refresh,
    login2.token.refresh,
  );

  const wrongPassword = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password">;
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "login fails for existing email + wrong password",
    async () => {
      const c: api.IConnection = { host: connection.host };
      await authorize_admin_login(c, {
        body: {
          email: joinEmail,
          password: wrongPassword,
        },
      });
    },
  );
  await TestValidator.error(
    "login fails for non-existent email + arbitrary password",
    async () => {
      const c: api.IConnection = { host: connection.host };
      await authorize_admin_login(c, {
        body: {
          email: nonExistentEmail,
          password: wrongPassword,
        },
      });
    },
  );

  const isHttpLikeError = (v: unknown): v is {
    status: unknown;
    message: unknown;
    method: unknown;
  } => {
    if (typeof v !== "object" || v === null) return false;
    const o = v as Record<string, unknown>;
    return "status" in o && "message" in o && "method" in o;
  };

  let err1: unknown;
  try {
    const c: api.IConnection = { host: connection.host };
    await authorize_admin_login(c, {
      body: {
        email: joinEmail,
        password: wrongPassword,
      },
    });
  } catch (e) {
    err1 = e;
  }

  let err2: unknown;
  try {
    const c: api.IConnection = { host: connection.host };
    await authorize_admin_login(c, {
      body: {
        email: nonExistentEmail,
        password: wrongPassword,
      },
    });
  } catch (e) {
    err2 = e;
  }

  TestValidator.predicate(
    "error type for existing email",
    () => isHttpLikeError(err1),
  );
  TestValidator.predicate(
    "error type for non-existent email",
    () => isHttpLikeError(err2),
  );

  if (!isHttpLikeError(err1) || !isHttpLikeError(err2)) {
    return;
  }

  const e1 = err1;
  const e2 = err2;

  TestValidator.equals("error status shape", e1.status, e2.status);
  TestValidator.equals(
    "error message type shape",
    typeof e1.message,
    typeof e2.message,
  );
  TestValidator.equals("error method shape", e1.method, e2.method);
}
