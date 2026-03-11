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

/**
 * Test that regular administrators cannot promote any administrators.
 *
 * Verifies that administrators with 'regular' grade cannot promote other
 * administrators to super grade, even when providing a valid roleId.
 * The system should reject such attempts with 403 Forbidden error.
 */
export async function test_api_admin_role_promotion_regular_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular administrator (Actor 1 - the one attempting promotion)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Response = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin1Response);
  // 2. Create another administrator (Actor 2 - the target for promotion)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Response = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin2Response);
  // 3. Attempt to promote admin2 using admin1's connection (regular admin)
  // This should fail with 403 Forbidden because admin1 is only 'regular' grade
  // and does not have promotion privileges
  await TestValidator.error(
    "regular admin cannot promote other admins",
    async () => {
      await api.functional.economicPoliticalBoard.admin.roles.promote(
        admin1Connection,
        {
          roleId: admin2Response.id,
        },
      );
    },
  );
  // 4. Verify error response indicates insufficient permissions
  // The HttpError should have status 403
  try {
    await api.functional.economicPoliticalBoard.admin.roles.promote(
      admin1Connection,
      {
        roleId: admin2Response.id,
      },
    );
    // If we reach here, the test failed (no error was thrown)
    throw new Error("Expected promotion to fail but it succeeded");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "promotion rejected with 403 Forbidden",
        error.status,
        403,
      );
      await TestValidator.predicate(
        "error message indicates insufficient permissions",
        () => {
          const json = error.toJSON();
          return typeof json.message === "string" &&
            json.message.toLowerCase().includes("permission");
        },
      );
    } else {
      throw new Error(`Expected HttpError but got: ${typeof error} - ${error}`);
    }
  }
}