import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminGradeRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminGradeRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promote_self_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a super administrator (this admin will be both actor and target)
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. The administrator's ID (they will try to promote themselves)
  const selfAdminId: string = adminAuth.id;
  // 3. Create a new connection for the promotion request with the admin's token
  const promoteConnection: api.IConnection = { host: connection.host };
  promoteConnection.headers ??= {};
  promoteConnection.headers.Authorization = adminAuth.token.access;
  // 4. Attempt to promote themselves (this should be forbidden)
  await TestValidator.error("self-promotion should be forbidden", async () => {
    await api.functional.ecommerceMall.admin.admin_grades.promote(
      promoteConnection,
      {
        body: {
          targetAdministratorId: selfAdminId,
        } satisfies IEcommerceMallAdminGradeRequest.IPromote,
      },
    );
  });
}
