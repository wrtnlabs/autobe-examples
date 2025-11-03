import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

export async function test_api_attribute_dimension_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (authenticates for privilege)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "support", "operator"] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Create attribute dimension to delete
  const dimCode = RandomGenerator.alphaNumeric(12);
  const dimBody = {
    dimension_code: dimCode,
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingAttributeDimension.ICreate;
  const dimension =
    await api.functional.shopping.admin.attributeDimensions.create(connection, {
      body: dimBody,
    });
  typia.assert(dimension);
  TestValidator.equals(
    "created dimension code matches",
    dimension.dimension_code,
    dimCode,
  );

  // 3. Hard delete (erase) by dimension_code
  await api.functional.shopping.admin.attributeDimensions.erase(connection, {
    dimensionCode: dimCode,
  });

  // 4. Repeat delete: should fail (already deleted/not-found)
  await TestValidator.error(
    "repeat hard delete returns not found or error",
    async () => {
      await api.functional.shopping.admin.attributeDimensions.erase(
        connection,
        { dimensionCode: dimCode },
      );
    },
  );

  // (Business constraint for testing dependency violation is outlined only; cannot test without SKU linkage API)
}
