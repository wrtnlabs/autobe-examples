import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_promotion_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call admin-promotions endpoint with default pagination (no filters)
  // Cast to correct structure since DTO has nested pagination but API returns flat
  const response =
    (await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    )) as unknown as {
      pagination: {
        current: number;
        limit: number;
        records: number;
        pages: number;
      };
      data: IEcommerceMallAdminPromotion.ISummary[];
    };
  typia.assert(response);
  // 3. Validate pagination metadata (IPage.IPagination uses: current, limit, records, pages)
  TestValidator.equals(
    "has pagination metadata",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is valid",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals("limit is valid", response.pagination.limit >= 0, true);
  TestValidator.equals(
    "records count is valid",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is valid",
    response.pagination.pages >= 0,
    true,
  );
  // 4. Validate data array exists and has correct structure
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  TestValidator.equals(
    "pagination and data lengths consistent",
    response.pagination.limit > 0
      ? response.data.length <= response.pagination.limit
      : true,
    true,
  );
  // 5. Validate structure of first record if exists
  if (response.data.length > 0) {
    const firstRecord = response.data[0];
    TestValidator.equals("record has id", firstRecord.id !== undefined, true);
    TestValidator.equals(
      "record has action",
      firstRecord.action !== undefined,
      true,
    );
    TestValidator.equals(
      "record has admin",
      firstRecord.admin !== undefined,
      true,
    );
    TestValidator.equals(
      "record has performedBySuperAdmin",
      firstRecord.performedBySuperAdmin !== undefined,
      true,
    );
    TestValidator.equals(
      "record has createdAt",
      firstRecord.createdAt !== undefined,
      true,
    );
    // Validate admin summary structure
    TestValidator.equals(
      "admin has id",
      firstRecord.admin.id !== undefined,
      true,
    );
    TestValidator.equals(
      "admin has email",
      firstRecord.admin.email !== undefined,
      true,
    );
    TestValidator.equals(
      "admin has name",
      (firstRecord.admin as IEcommerceMallAdmin.ISummary).name !== undefined,
      true,
    );
    // Validate performedBySuperAdmin summary structure
    TestValidator.equals(
      "performedBySuperAdmin has id",
      firstRecord.performedBySuperAdmin.id !== undefined,
      true,
    );
    TestValidator.equals(
      "performedBySuperAdmin has email",
      firstRecord.performedBySuperAdmin.email !== undefined,
      true,
    );
    // 6. Validate ordering by created_at descending (if multiple records)
    if (response.data.length > 1) {
      for (let i = 0; i < response.data.length - 1; i++) {
        const current = new Date(response.data[i].createdAt).getTime();
        const next = new Date(response.data[i + 1].createdAt).getTime();
        TestValidator.predicate(
          `record ${i} createdAt >= record ${i + 1} createdAt`,
          current >= next,
        );
      }
    }
  }
}
