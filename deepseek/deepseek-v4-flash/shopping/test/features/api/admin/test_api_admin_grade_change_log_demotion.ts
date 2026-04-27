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

export async function test_api_admin_grade_change_log_demotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin1 who will be promoted to super administrator
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin1);
  // 2. Promote admin1 to super administrator (bootstrap first super admin)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin1.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin1);
  // 3. Create admin2 who will be promoted and then demoted
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin2);
  // 4. As superAdmin1, promote admin2 to super administrator
  // Creates a grade change log with previous_grade='regular', new_grade='super'
  const promotedAdmin2 =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      superAdminConnection,
      { administratorId: admin2.id },
    );
  typia.assert(promotedAdmin2);
  TestValidator.equals(
    "promoted admin2 grade is super",
    promotedAdmin2.administrator.grade,
    "super",
  );
  // 5. As superAdmin1, demote admin2 back to regular administrator
  // Creates a grade change log with previous_grade='super', new_grade='regular'
  const demotedAdmin2 =
    await api.functional.eCommerceMall.superAdministrator.administrators.demote(
      superAdminConnection,
      { administratorId: admin2.id },
    );
  typia.assert(demotedAdmin2);
  // 6. Verify admin2 is now a regular administrator
  TestValidator.equals(
    "demoted admin2 grade is regular",
    demotedAdmin2.grade,
    "regular",
  );
}
