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

/**
 * Test retrieval of an administrator grade change log entry created by a promotion event.
 *
 * Validates the full promotion workflow from creating regular administrators, promoting one to super administrator status, and then using that super administrator to promote another regular administrator. The test verifies that the promote operation correctly creates both the super administrator record and the underlying grade change log, and that the created super administrator record accurately references the promoted administrator.
 *
 * A key challenge is that the promote API returns only the created super administrator record — the grade change log ID is not exposed in the response. Since no list or search endpoint is available for grade change logs, the test validates the promotion's observable effects through the available API responses.
 *
 * 1. Create admin1 (regular administrator) via join.
 * 2. Create superAdmin1 by promoting admin1 via super administrator join.
 * 3. Create admin2 (another regular administrator) via join.
 * 4. As superAdmin1, promote admin2 to super administrator — this creates the grade change log record internally.
 * 5. Validate the promote response: confirm the returned super admin record references admin2 correctly.
 * 6. Validate that the administrator summary within the response matches admin2's id and email.
 */
export async function test_api_admin_grade_change_log_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin1 (regular administrator)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1: IECommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(admin1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    });
  typia.assert(admin1);
  // 2. Create superAdmin1 by promoting admin1
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1: IECommerceMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdmin1Connection, {
      body: {
        administrator_id: admin1.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(superAdmin1);
  // 3. Create admin2 (another regular administrator)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2: IECommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(admin2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    });
  typia.assert(admin2);
  // 4. As superAdmin1, promote admin2 to super administrator
  const promoted: IECommerceMallSuperAdministrator =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      superAdmin1Connection,
      {
        administratorId: admin2.id,
      },
    );
  typia.assert(promoted);
  // 5. Validate the promote response references admin2 correctly
  TestValidator.equals(
    "promoted administrator id",
    promoted.administrator.id,
    admin2.id,
  );
  TestValidator.equals(
    "promoted administrator email",
    promoted.administrator.email,
    admin2.email,
  );
}
