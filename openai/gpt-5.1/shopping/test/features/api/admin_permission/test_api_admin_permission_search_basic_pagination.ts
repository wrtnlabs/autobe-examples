import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPermission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new shopping mall admin and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Seed multiple admin permission records with distinct codes, names, and categories
  const seedCount = 15;
  const createdPermissions: IShoppingMallAdminPermission[] = [];

  for (let i = 0; i < seedCount; i++) {
    const categoryOptions = [
      "users",
      "orders",
      "catalog",
      "risk",
      "configuration",
    ] as const;
    const category = RandomGenerator.pick(categoryOptions);

    const createBody = {
      code: `perm.${RandomGenerator.alphaNumeric(8)}.${i}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      category,
      is_system: i % 2 === 0,
    } satisfies IShoppingMallAdminPermission.ICreate;

    const permission: IShoppingMallAdminPermission =
      await api.functional.shoppingMall.admin.adminPermissions.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert<IShoppingMallAdminPermission>(permission);

    createdPermissions.push(permission);
  }

  TestValidator.equals(
    "number of created permissions must equal seedCount",
    createdPermissions.length,
    seedCount,
  );

  // 3. Call PATCH /shoppingMall/admin/adminPermissions with basic pagination only
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit,
  } satisfies IShoppingMallAdminPermission.IRequest;

  const pageResult: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 4. Verify pagination metadata consistency
  TestValidator.equals(
    "pagination.current should equal requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be at least seedCount",
    pagination.records >= createdPermissions.length,
  );

  TestValidator.predicate(
    "pagination.pages should be at least 1",
    pagination.pages >= 1,
  );

  // 5. Verify data array and mapping to created permissions (subset by id)
  const data = pageResult.data;

  TestValidator.predicate(
    "returned data length should be less than or equal to requested limit",
    data.length <= limit,
  );

  // Create a lookup map for created permissions by id for quick verification
  const createdById = new Map<string, IShoppingMallAdminPermission>();
  for (const perm of createdPermissions) {
    createdById.set(perm.id, perm);
  }

  for (const summary of data) {
    typia.assert<IShoppingMallAdminPermission.ISummary>(summary);

    const original = createdById.get(summary.id);

    if (original) {
      TestValidator.equals(
        "summary.code should match created permission code",
        summary.code,
        original.code,
      );
      TestValidator.equals(
        "summary.name should match created permission name",
        summary.name,
        original.name,
      );
      TestValidator.equals(
        "summary.category should match created permission category",
        summary.category,
        original.category,
      );
      TestValidator.equals(
        "summary.is_system should match created permission is_system",
        summary.is_system,
        original.is_system,
      );
      TestValidator.equals(
        "summary.created_at should match created permission created_at",
        summary.created_at,
        original.created_at,
      );
      TestValidator.equals(
        "summary.updated_at should match created permission updated_at",
        summary.updated_at,
        original.updated_at,
      );
    }
  }
}
