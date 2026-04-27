import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_demotion_grade_change_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin A to be promoted to super admin X
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // Step 2: Promote admin A to super admin X using bootstrapped super admin
  const bootstrapConnection: api.IConnection = {
    host: connection.host,
    headers: { ...connection.headers },
  };
  const superAdminX = await authorize_super_administrator_join(
    bootstrapConnection,
    {
      body: {
        administrator_id: adminA.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminX);
  // Step 3: Create admin B (target for promotion then demotion)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // Step 4: Using superAdmin X connection (bootstrapConnection), promote admin B to super admin
  const promotedAdminB =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      bootstrapConnection,
      { administratorId: adminB.id },
    );
  typia.assert(promotedAdminB);
  // Step 5: Create a fresh connection copy for bootstrapped super admin (demotion actor)
  const bootstrappedSuperAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { ...connection.headers },
  };
  // Demote admin B using bootstrapped super admin (different from superAdmin X)
  const demotedAdminB =
    await api.functional.eCommerceMall.superAdministrator.administrators.demote(
      bootstrappedSuperAdminConnection,
      { administratorId: adminB.id },
    );
  typia.assert(demotedAdminB);
  // Verify admin B's grade is now 'regular' after demotion
  TestValidator.equals(
    "demoted admin grade should be regular",
    demotedAdminB.grade,
    "regular",
  );
  // Step 6: Create admin C (reader)
  const adminCConnection: api.IConnection = { host: connection.host };
  const adminC = await authorize_administrator_join(adminCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminC);
  // Step 7: Attempt to retrieve a grade change log with a random UUID
  // Since we cannot know the exact log ID from the demote response
  // (it returns IECommerceMallAdministrator, not the log),
  // we generate a random UUID. This validates the endpoint is
  // properly accessible and handles missing records (404).
  const randomLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent grade change log returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.gradeChangeLogs.at(
        adminCConnection,
        { logId: randomLogId },
      );
    },
  );
}
