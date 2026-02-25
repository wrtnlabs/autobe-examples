import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_promotion_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Simulate creation of an administrator promotion record
  // We rely on random valid UUID to query, no special creation because no utility to create promotion record
  const promotionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the administrator promotion by promotionId
  const promotion =
    await api.functional.discussionBoard.superAdministrator.administrator.promotions.atAdministratorPromotion(
      superAdminConnection,
      { promotionId },
    );
  typia.assert(promotion);
  // 4. Validate response fields
  TestValidator.predicate(
    "promotion has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      promotion.id,
    ),
  );
  TestValidator.equals("promotionId matches", promotion.id, promotionId);
  TestValidator.predicate(
    "has administrator summary",
    promotion.administrator !== null &&
      typeof promotion.administrator.id === "string",
  );
  TestValidator.predicate("has old grade summary", promotion.oldGrade !== null);
  TestValidator.predicate("has new grade summary", promotion.newGrade !== null);
  TestValidator.predicate(
    "has createdAt timestamp",
    typeof promotion.createdAt === "string",
  );
  TestValidator.predicate(
    "has updatedAt timestamp",
    typeof promotion.updatedAt === "string",
  );
  // 5. Check ISO 8601 date format for timestamps
  TestValidator.predicate(
    "createdAt is ISO 8601",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/.test(
      promotion.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/.test(
      promotion.updatedAt,
    ),
  );
  // 6. Validate deletedAt is either string or null or undefined
  if (promotion.deletedAt !== null && promotion.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt is string if present",
      typeof promotion.deletedAt === "string",
    );
  }
}
