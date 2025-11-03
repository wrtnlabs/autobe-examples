import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingBusinessSetting";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessSetting";

/**
 * Validates that an admin can search and paginate business settings, including
 * filtering by text and date fields, verifying visibility of all fields, and
 * correct pagination metadata. Also ensures unauthorized users cannot access
 * the endpoint.
 *
 * Steps:
 *
 * 1. Register a new admin and authenticate.
 * 2. Perform basic search (no filters) as admin; check that the data is an array
 *    of ISummary and pagination matches requirements.
 * 3. Apply text-based filter (setting_key, setting_value or description) and
 *    verify results only contain matching records.
 * 4. Apply date-based filter on created_at, updated_at and verify results are
 *    filtered appropriately.
 * 5. Test pagination: request pages and verify data/metadata correctness.
 * 6. Test sort_by and sort_order parameters ensure correct result order.
 * 7. Logout admin or create unauthenticated connection and verify non-admin CANNOT
 *    access the endpoint (should get error).
 */
export async function test_api_business_settings_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "support",
          "compliance",
          "operator",
        ] as const),
        status: RandomGenerator.pick([
          "active",
          "pending",
          "suspended",
        ] as const),
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Perform basic search as admin
  const baseSearchBody = {} satisfies IShoppingBusinessSetting.IRequest;
  const basicResult =
    await api.functional.shopping.admin.businessSettings.index(connection, {
      body: baseSearchBody,
    });
  typia.assert(basicResult);
  // Assert ISummary type for all items
  basicResult.data.forEach((setting) => typia.assert(setting));
  TestValidator.predicate(
    "pagination current page is >= 1",
    basicResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 1",
    basicResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    basicResult.pagination.pages >= 0,
  );

  // 3. Apply text filters
  if (basicResult.data.length > 0) {
    const sampled = RandomGenerator.pick(basicResult.data);
    // Filter by setting_key
    const keyFilterBody = {
      setting_key: RandomGenerator.substring(sampled.setting_key),
    } satisfies IShoppingBusinessSetting.IRequest;
    const byKey = await api.functional.shopping.admin.businessSettings.index(
      connection,
      { body: keyFilterBody },
    );
    typia.assert(byKey);
    byKey.data.forEach((setting) => {
      typia.assert(setting);
      TestValidator.predicate(
        "every setting_key in filter result contains filter text",
        setting.setting_key
          .toLowerCase()
          .includes(keyFilterBody.setting_key!.toLowerCase()),
      );
    });
    // Filter by setting_value
    const valFilterBody = {
      setting_value: RandomGenerator.substring(sampled.setting_value),
    } satisfies IShoppingBusinessSetting.IRequest;
    const byValue = await api.functional.shopping.admin.businessSettings.index(
      connection,
      { body: valFilterBody },
    );
    typia.assert(byValue);
    byValue.data.forEach((setting) => {
      typia.assert(setting);
      TestValidator.predicate(
        "every setting_value in filter result contains filter text",
        setting.setting_value
          .toLowerCase()
          .includes(valFilterBody.setting_value!.toLowerCase()),
      );
    });
    // Filter by description text (if present)
    if (sampled.description) {
      const descFilterBody = {
        description: RandomGenerator.substring(sampled.description),
      } satisfies IShoppingBusinessSetting.IRequest;
      const byDesc = await api.functional.shopping.admin.businessSettings.index(
        connection,
        { body: descFilterBody },
      );
      typia.assert(byDesc);
      byDesc.data.forEach((setting) => {
        typia.assert(setting);
        TestValidator.predicate(
          "every description in filter result contains filter text",
          !!setting.description &&
            setting.description
              .toLowerCase()
              .includes(descFilterBody.description!.toLowerCase()),
        );
      });
    }
  }

  // 4. Apply date filters (if at least one result exists)
  if (basicResult.data.length > 0) {
    const ref = RandomGenerator.pick(basicResult.data);
    // created_before
    const beforeBody = {
      created_before: ref.created_at,
    } satisfies IShoppingBusinessSetting.IRequest;
    const beforeResult =
      await api.functional.shopping.admin.businessSettings.index(connection, {
        body: beforeBody,
      });
    typia.assert(beforeResult);
    beforeResult.data.forEach((setting) => {
      typia.assert(setting);
      TestValidator.predicate(
        "all created_at <= filter date",
        new Date(setting.created_at) <= new Date(ref.created_at),
      );
    });
    // created_after
    const afterBody = {
      created_after: ref.created_at,
    } satisfies IShoppingBusinessSetting.IRequest;
    const afterResult =
      await api.functional.shopping.admin.businessSettings.index(connection, {
        body: afterBody,
      });
    typia.assert(afterResult);
    afterResult.data.forEach((setting) => {
      typia.assert(setting);
      TestValidator.predicate(
        "all created_at >= filter date",
        new Date(setting.created_at) >= new Date(ref.created_at),
      );
    });
    // updated_before
    const updatedBeforeBody = {
      updated_before: ref.updated_at,
    } satisfies IShoppingBusinessSetting.IRequest;
    const updatedBeforeResult =
      await api.functional.shopping.admin.businessSettings.index(connection, {
        body: updatedBeforeBody,
      });
    typia.assert(updatedBeforeResult);
    updatedBeforeResult.data.forEach((setting) => {
      typia.assert(setting);
      TestValidator.predicate(
        "all updated_at <= filter date",
        new Date(setting.updated_at) <= new Date(ref.updated_at),
      );
    });
    // updated_after
    const updatedAfterBody = {
      updated_after: ref.updated_at,
    } satisfies IShoppingBusinessSetting.IRequest;
    const updatedAfterResult =
      await api.functional.shopping.admin.businessSettings.index(connection, {
        body: updatedAfterBody,
      });
    typia.assert(updatedAfterResult);
    updatedAfterResult.data.forEach((setting) => {
      typia.assert(setting);
      TestValidator.predicate(
        "all updated_at >= filter date",
        new Date(setting.updated_at) >= new Date(ref.updated_at),
      );
    });
  }

  // 5. Test pagination
  const pageBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingBusinessSetting.IRequest;
  const paged = await api.functional.shopping.admin.businessSettings.index(
    connection,
    { body: pageBody },
  );
  typia.assert(paged);
  TestValidator.equals("page current page is 1", paged.pagination.current, 1);
  TestValidator.equals("page limit is 2", paged.pagination.limit, 2);

  if (paged.data.length > 0) {
    // 6. Test sort_by and sort_order
    const sortFields = ["setting_key", "created_at", "updated_at"] as const;
    const sortOrders = ["asc", "desc"] as const;
    for (const sort_by of sortFields) {
      for (const sort_order of sortOrders) {
        const sortBody = {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page_size: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by,
          sort_order,
        } satisfies IShoppingBusinessSetting.IRequest;
        const sorted =
          await api.functional.shopping.admin.businessSettings.index(
            connection,
            { body: sortBody },
          );
        typia.assert(sorted);
        if (sorted.data.length > 1) {
          for (let i = 1; i < sorted.data.length; ++i) {
            const prev = sorted.data[i - 1];
            const curr = sorted.data[i];
            if (sort_by === "created_at" || sort_by === "updated_at") {
              const prevDate = new Date(prev[sort_by]);
              const currDate = new Date(curr[sort_by]);
              if (sort_order === "asc") {
                TestValidator.predicate(
                  `${sort_by} ascending order`,
                  prevDate <= currDate,
                );
              } else {
                TestValidator.predicate(
                  `${sort_by} descending order`,
                  prevDate >= currDate,
                );
              }
            } else if (sort_by === "setting_key") {
              if (sort_order === "asc") {
                TestValidator.predicate(
                  `setting_key ascending order`,
                  prev.setting_key.localeCompare(curr.setting_key) <= 0,
                );
              } else {
                TestValidator.predicate(
                  `setting_key descending order`,
                  prev.setting_key.localeCompare(curr.setting_key) >= 0,
                );
              }
            }
          }
        }
      }
    }
  }

  // 7. Verify non-admin user cannot access endpoint
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin should not access businessSettings search",
    async () => {
      await api.functional.shopping.admin.businessSettings.index(unauthConn, {
        body: {} satisfies IShoppingBusinessSetting.IRequest,
      });
    },
  );
}
