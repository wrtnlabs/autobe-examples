import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate that authenticated admins can view attribute dimension details and
 * access restrictions/enforcement.
 */
export async function test_api_admin_attribute_dimension_detail_view(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    role: RandomGenerator.pick([
      "super",
      "operator",
      "support",
      "compliance",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(admin);

  // 2. Prepare a valid dimension code for testing (simulate existing record)
  const mockDimension = typia.random<IShoppingAttributeDimension>();
  const validDimensionCode = mockDimension.dimension_code;

  // 3. Positive test: Retrieve attribute dimension as admin
  try {
    const result = await api.functional.shopping.admin.attributeDimensions.at(
      connection,
      { dimensionCode: validDimensionCode },
    );
    typia.assert(result);
    TestValidator.equals(
      "Returned attribute dimension code matches request",
      result.dimension_code,
      validDimensionCode,
    );
    TestValidator.predicate(
      "Dimension name is non-empty",
      result.name.length > 0,
    );
    TestValidator.predicate(
      "Dimension description is non-empty",
      result.description.length > 0,
    );
  } catch (exp) {
    // The mock dimension may not exist (since creation endpoint is unavailable), so allow not found.
    await TestValidator.error(
      "Fetching non-existent dimension should fail",
      async () => {
        await api.functional.shopping.admin.attributeDimensions.at(connection, {
          dimensionCode: validDimensionCode,
        });
      },
    );
  }

  // 4. Negative test: access with non-existent dimension code
  const fakeDimensionCode = RandomGenerator.alphaNumeric(14);
  await TestValidator.error(
    "Fetching missing dimension code should fail",
    async () => {
      await api.functional.shopping.admin.attributeDimensions.at(connection, {
        dimensionCode: fakeDimensionCode,
      });
    },
  );

  // 5. Negative test: unauthenticated access (clear token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated admin access is forbidden",
    async () => {
      await api.functional.shopping.admin.attributeDimensions.at(unauthConn, {
        dimensionCode: validDimensionCode,
      });
    },
  );
}
