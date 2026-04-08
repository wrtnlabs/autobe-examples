import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and submit admin join request
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  await api.functional.ecommerceMall.auth.admin.request.join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Login as admin to get authenticated session
  await authorize_admin_login(adminConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Call the sessions list endpoint with empty body
  const sessionsResponse =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(sessionsResponse);
  // 4. Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination exists",
    !!sessionsResponse.pagination,
  );
  // Type-safe pagination validation using typia assertGuard to narrow the type
  if (sessionsResponse.pagination) {
    typia.assertGuard<IPage.IPagination>(sessionsResponse.pagination);
  }
  // 5. Validate sessions are sorted by createdAt descending
  for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
    const current = new Date(sessionsResponse.data[i].createdAt).getTime();
    const next = new Date(sessionsResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `session ${i} should have createdAt >= session ${i + 1}`,
      current >= next,
    );
  }
  // 6. Validate each session includes required fields
  for (const session of sessionsResponse.data) {
    TestValidator.predicate("session has valid id", !!session.id);
    TestValidator.predicate("session.admin has valid id", !!session.admin?.id);
    TestValidator.predicate("session.admin has name", !!session.admin?.name);
    TestValidator.predicate("session has ip", !!session.ip);
    TestValidator.predicate("session has href", !!session.href);
    TestValidator.predicate("session has referrer", !!session.referrer);
    TestValidator.predicate("session has valid createdAt", !!session.createdAt);
    TestValidator.predicate("session has valid expiredAt", !!session.expiredAt);
  }
}
