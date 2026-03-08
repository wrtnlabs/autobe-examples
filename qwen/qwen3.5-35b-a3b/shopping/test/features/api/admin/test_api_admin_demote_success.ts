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

export async function test_api_admin_demote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator A (demoting admin)
  const adminACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAAuth = await authorize_admin_join(adminAConnection, {
    body: adminACredentials,
  });
  typia.assert(adminAAuth);
  // 2. Create and authenticate super administrator B (target admin to be demoted)
  const adminBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBAuth = await authorize_admin_join(adminBConnection, {
    body: adminBCredentials,
  });
  typia.assert(adminBAuth);
  // 3. Get admin B's ID before demotion
  const adminBId = adminBAuth.id;
  // 4. Admin A sends demote request for admin B
  const demoteReason = "Performance concerns and role adjustment";
  const demoteRequestBody = {
    reason: demoteReason,
  } satisfies IEcommerceMallAdmin.IDemoteRequest;
  const demoteResponse = await api.functional.ecommerceMall.admin.admins.demote(
    adminAConnection,
    {
      adminId: adminBId,
      body: demoteRequestBody,
    },
  );
  typia.assert(demoteResponse);
  // 5. Verify response shows admin_grade = "regular"
  TestValidator.equals(
    "admin grade after demotion",
    demoteResponse.admin_grade,
    "regular",
  );
  // 6. Verify updated_at timestamp is updated
  const now = new Date().toISOString();
  const timestampDifference = Math.abs(
    new Date(now).getTime() - new Date(demoteResponse.updated_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at is recent",
    timestampDifference < 1000 * 60 * 10,
  ); // within 10 minutes
}
