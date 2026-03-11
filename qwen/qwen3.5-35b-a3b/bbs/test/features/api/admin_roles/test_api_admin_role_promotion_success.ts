import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_role_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account (promoter)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResponse = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(superAdminResponse);
  // Step 2: Create regular administrator account (target to be promoted)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminResponse = await authorize_admin_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    },
  );
  typia.assert(regularAdminResponse);
  // Step 3: Promote regular admin to super admin using super admin connection
  const promotionResponse =
    await api.functional.economicPoliticalBoard.admin.roles.promote(
      superAdminConnection,
      {
        roleId: regularAdminResponse.id,
      },
    );
  typia.assert(promotionResponse);
  // Step 4: Validate promotion response
  TestValidator.equals(
    "grade changed to super",
    promotionResponse.grade,
    "super",
  );
  TestValidator.predicate(
    "promoted_at timestamp is set",
    promotionResponse.promoted_at !== null &&
      promotionResponse.promoted_at !== undefined,
  );
  TestValidator.notEquals(
    "promoted_at is not null",
    promotionResponse.promoted_at,
    null,
  );
  TestValidator.equals(
    "promotedByUser is set to super admin ID",
    promotionResponse.promotedByUser?.id,
    superAdminResponse.id,
  );
  TestValidator.equals(
    "user id matches regular admin ID",
    promotionResponse.user.id,
    regularAdminResponse.id,
  );
}