import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_grade_demotion_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // Create first super administrator who will perform the demotion
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://test.com/join",
        referrer: "https://test.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin1);
  // Create second super administrator who will be demoted
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://test.com/join",
        referrer: "https://test.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin2);
  // Verify both administrators have super_admin grade initially
  TestValidator.equals(
    "first super admin grade",
    superAdmin1.grade,
    "super_admin",
  );
  TestValidator.equals(
    "second super admin grade",
    superAdmin2.grade,
    "super_admin",
  );
  // Demote the second super administrator to regular using the first super administrator
  const demotedAdmin =
    await api.functional.ecommerceMall.superAdmin.admins.grade.updateGrade(
      superAdmin1Connection,
      {
        adminId: superAdmin2.id,
        body: {
          grade: "regular",
        } satisfies IEcommerceMallAdmin.IUpdateGrade,
      },
    );
  typia.assert(demotedAdmin);
  // Verify the grade was successfully changed to regular
  TestValidator.equals(
    "demoted admin grade is regular",
    demotedAdmin.grade,
    "regular",
  );
  TestValidator.equals(
    "demoted admin ID matches",
    demotedAdmin.id,
    superAdmin2.id,
  );
  TestValidator.equals(
    "demoted admin email matches",
    demotedAdmin.email,
    superAdmin2.email,
  );
  // Verify the demoted administrator cannot perform super administrator operations
  // Attempting to demote another admin should fail for the now-regular administrator
  await TestValidator.error(
    "demoted admin cannot access super admin endpoints",
    async () => {
      await api.functional.ecommerceMall.superAdmin.admins.grade.updateGrade(
        superAdmin2Connection,
        {
          adminId: superAdmin1.id,
          body: {
            grade: "regular",
          } satisfies IEcommerceMallAdmin.IUpdateGrade,
        },
      );
    },
  );
}
