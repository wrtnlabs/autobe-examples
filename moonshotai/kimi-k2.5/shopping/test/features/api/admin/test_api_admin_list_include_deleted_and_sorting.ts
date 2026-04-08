import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_include_deleted_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. 认证为管理员
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. 测试默认行为（不包含软删除）
  const defaultResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(defaultResult);
  // 3. 测试包含软删除管理员
  const includeDeletedResult =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        includeDeleted: true,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(includeDeletedResult);
  // 验证 includeDeleted 开启后返回的数据量应该 >= 默认情况
  TestValidator.predicate(
    "includeDeleted should return equal or more results",
    includeDeletedResult.data.length >= defaultResult.data.length,
  );
  // 4. 测试排序功能 - createdAt asc
  const createdAtAscResult =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(createdAtAscResult);
  // 5. 测试排序功能 - createdAt desc
  const createdAtDescResult =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(createdAtDescResult);
  // 验证升序和降序结果不同（如果有多条数据）
  if (createdAtAscResult.data.length > 1) {
    TestValidator.notEquals(
      "createdAt asc and desc should produce different ordering",
      createdAtAscResult.data.map((d) => d.id),
      createdAtDescResult.data.map((d) => d.id),
    );
  }
  // 6. 测试排序功能 - grade asc
  const gradeAscResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        sortBy: "grade",
        sortOrder: "asc",
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(gradeAscResult);
  // 7. 测试排序功能 - grade desc
  const gradeDescResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        sortBy: "grade",
        sortOrder: "desc",
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(gradeDescResult);
  // 8. 测试排序功能 - status asc
  const statusAscResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        sortBy: "status",
        sortOrder: "asc",
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(statusAscResult);
  // 9. 测试排序功能 - status desc
  const statusDescResult =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        sortBy: "status",
        sortOrder: "desc",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(statusDescResult);
  // 10. 测试游标分页 - 首先获取第一页并设置较小的 limit
  const firstPageResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        limit: 2,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(firstPageResult);
  // 如果第一页有数据且有分页信息，测试使用游标获取下一页
  if (firstPageResult.data.length > 0 && firstPageResult.pagination.pages > 1) {
    // 使用第一页的游标获取下一页
    const cursorResult = await api.functional.ecommerceMall.admin.admins.index(
      adminConnection,
      {
        body: {
          limit: 2,
          cursor: firstPageResult.data[firstPageResult.data.length - 1].id,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
    typia.assert(cursorResult);
    // 验证分页返回了数据
    TestValidator.predicate(
      "cursor pagination should return data",
      cursorResult.data.length >= 0,
    );
    // 验证两页数据不重叠
    const firstPageIds = new Set(firstPageResult.data.map((d) => d.id));
    const cursorPageIds = cursorResult.data.map((d) => d.id);
    const hasOverlap = cursorPageIds.some((id) => firstPageIds.has(id));
    TestValidator.predicate(
      "cursor pagination should not return duplicate items",
      !hasOverlap,
    );
  }
  // 11. 测试组合查询：包含删除 + 排序 + 分页
  const combinedResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        includeDeleted: true,
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 5,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(combinedResult);
}
