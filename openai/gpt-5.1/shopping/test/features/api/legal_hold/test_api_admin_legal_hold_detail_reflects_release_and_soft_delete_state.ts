import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

export async function test_api_admin_legal_hold_detail_reflects_release_and_soft_delete_state(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create first "active" legal hold
  const activeCode: string = RandomGenerator.alphaNumeric(16);
  const activeCreateBody = {
    code: activeCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const activeCreated: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: activeCreateBody,
    });
  typia.assert(activeCreated);

  // 3. Fetch detail for first legal hold and validate immutability and consistency
  const activeDetail: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: activeCreated.code,
    });
  typia.assert(activeDetail);

  // id and code should be stable between create and detail
  TestValidator.equals(
    "active legal hold id remains consistent between create and detail",
    activeDetail.id,
    activeCreated.id,
  );
  TestValidator.equals(
    "active legal hold code remains consistent between create and detail",
    activeDetail.code,
    activeCreated.code,
  );

  // created_at should remain immutable
  TestValidator.equals(
    "active legal hold created_at is immutable",
    activeDetail.created_at,
    activeCreated.created_at,
  );

  // status should be preserved as created
  TestValidator.equals(
    "active legal hold status from detail matches created status",
    activeDetail.status,
    activeCreated.status,
  );

  // updated_at should be at or after created_at
  const activeCreatedAtDate = new Date(activeCreated.created_at);
  const activeUpdatedAtDate = new Date(activeDetail.updated_at);
  TestValidator.predicate(
    "active legal hold updated_at is greater than or equal to created_at",
    activeUpdatedAtDate.getTime() >= activeCreatedAtDate.getTime(),
  );

  // released_at and deleted_at should not unexpectedly change between create and detail
  TestValidator.equals(
    "active legal hold released_at remains consistent between create and detail",
    activeDetail.released_at ?? null,
    activeCreated.released_at ?? null,
  );
  TestValidator.equals(
    "active legal hold deleted_at remains consistent between create and detail",
    activeDetail.deleted_at ?? null,
    activeCreated.deleted_at ?? null,
  );

  // 4. Create second legal hold with a different status to simulate another lifecycle state
  const releasedCode: string = RandomGenerator.alphaNumeric(16);
  const releasedCreateBody = {
    code: releasedCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "released",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const releasedCreated: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: releasedCreateBody,
    });
  typia.assert(releasedCreated);

  // 5. Fetch detail for second legal hold and validate
  const releasedDetail: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: releasedCreated.code,
    });
  typia.assert(releasedDetail);

  TestValidator.equals(
    "released legal hold id remains consistent between create and detail",
    releasedDetail.id,
    releasedCreated.id,
  );
  TestValidator.equals(
    "released legal hold code remains consistent between create and detail",
    releasedDetail.code,
    releasedCreated.code,
  );
  TestValidator.equals(
    "released legal hold created_at is immutable",
    releasedDetail.created_at,
    releasedCreated.created_at,
  );
  TestValidator.equals(
    "released legal hold status from detail matches created status",
    releasedDetail.status,
    releasedCreated.status,
  );

  const releasedCreatedAtDate = new Date(releasedCreated.created_at);
  const releasedUpdatedAtDate = new Date(releasedDetail.updated_at);
  TestValidator.predicate(
    "released legal hold updated_at is greater than or equal to created_at",
    releasedUpdatedAtDate.getTime() >= releasedCreatedAtDate.getTime(),
  );

  TestValidator.equals(
    "released legal hold released_at remains consistent between create and detail",
    releasedDetail.released_at ?? null,
    releasedCreated.released_at ?? null,
  );
  TestValidator.equals(
    "released legal hold deleted_at remains consistent between create and detail",
    releasedDetail.deleted_at ?? null,
    releasedCreated.deleted_at ?? null,
  );

  // 6. Ensure that detail lookups by code do not cross-contaminate records
  TestValidator.notEquals(
    "active and released legal holds must have different ids",
    activeCreated.id,
    releasedCreated.id,
  );
  TestValidator.notEquals(
    "active and released legal holds must have different codes",
    activeCreated.code,
    releasedCreated.code,
  );

  const lookupActiveAgain: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: activeCode,
    });
  typia.assert(lookupActiveAgain);

  TestValidator.equals(
    "lookup by active code always returns the active legal hold id",
    lookupActiveAgain.id,
    activeCreated.id,
  );
  TestValidator.notEquals(
    "lookup by active code must not return released legal hold id",
    lookupActiveAgain.id,
    releasedCreated.id,
  );

  const lookupReleasedAgain: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: releasedCode,
    });
  typia.assert(lookupReleasedAgain);

  TestValidator.equals(
    "lookup by released code always returns the released legal hold id",
    lookupReleasedAgain.id,
    releasedCreated.id,
  );
  TestValidator.notEquals(
    "lookup by released code must not return active legal hold id",
    lookupReleasedAgain.id,
    activeCreated.id,
  );
}
