import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that a regular administrator cannot promote another administrator.
 *
 * Regular administrators should receive a 403 Forbidden error when attempting
 * to promote another administrator. Only super administrators have the authority
 * to perform promotion operations.
 */
export async function test_api_administrator_promotion_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first regular administrator (requester who will attempt promotion)
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_administrator_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  typia.assert(requester);
  // Verify requester has 'regular' grade (new accounts default to regular)
  TestValidator.equals(
    "requester grade is regular",
    requester.grade,
    "regular",
  );
  // 2. Create second regular administrator (target of the promotion attempt)
  const target = await authorize_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      },
    },
  );
  typia.assert(target);
  // Verify target has 'regular' grade
  TestValidator.equals("target grade is regular", target.grade, "regular");
  // 3. Regular administrator attempts to promote another administrator
  // Should receive 403 Forbidden error
  await TestValidator.httpError(
    "regular admin cannot promote another admin",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.promote(
        requesterConnection,
        {
          administratorId: target.id,
          body: {
            confirmation: true,
          } satisfies IShoppingMallAdministrator.IPromote,
        },
      );
    },
  );
}
