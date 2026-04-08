import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_demotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate super administrator A (demoting actor)
  const demotingConnection: api.IConnection = { host: connection.host };
  const demotingAuth = await authorize_super_administrator_join(
    demotingConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(demotingAuth);
  // 2. Setup: Create and authenticate super administrator B (target to be demoted)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_super_administrator_join(
    targetConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(targetAuth);
  // 3. Execute grade change: Super admin A demotes super admin B to regular grade
  const adminIdToUpdate = targetAuth.superAdministrator.id;
  const gradeChangeBody = {
    administrator_id: adminIdToUpdate,
    new_grade: "regular" as const,
    reason: "Grade demotion test - verifying admin grade transition workflow",
  } satisfies IEcommerceMallAdministratorGrade.IRequest;
  const response =
    await api.functional.ecommerceMall.superAdministrator.administrator_grades.update(
      demotingConnection,
      { body: gradeChangeBody },
    );
  typia.assert(response);
  // 4. Verify the grade change operation succeeded
  TestValidator.equals(
    "response contains administrator ID",
    response.id,
    adminIdToUpdate,
  );
  TestValidator.equals(
    "grade changed from super to regular",
    response.grade,
    "regular",
  );
  TestValidator.equals(
    "display name matches",
    response.display_name,
    targetAuth.superAdministrator.display_name,
  );
  TestValidator.equals(
    "email matches",
    response.email,
    targetAuth.superAdministrator.email,
  );
  // 5. Verify the administrator's updated_at timestamp is recent
  const updatedAt = new Date(response.updated_at);
  const now = new Date();
  const timeDiff = now.getTime() - updatedAt.getTime();
  TestValidator.predicate(
    "updated_at is recent",
    timeDiff >= 0 && timeDiff <= 5000,
  );
  // 6. Verify is_banned is false (demotion should not affect ban status)
  TestValidator.equals("is_banned is false", response.is_banned, false);
}
