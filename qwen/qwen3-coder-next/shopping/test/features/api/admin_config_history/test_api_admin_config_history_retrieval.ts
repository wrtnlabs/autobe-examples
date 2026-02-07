import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import type { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_config_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Register admin user and update connection with auth token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // Call history index endpoint with empty request body
  const result = await api.functional.shoppingMall.admin.configs.history.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // Validate pagination metadata fields
  const pagination = result.pagination;
  TestValidator.predicate(
    "current page is valid",
    typeof pagination.current === "number" && pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is valid",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  // Validate each configuration history record structure
  for (const record of result.data) {
    TestValidator.predicate("record has id", typeof (record as any).id === "string");
    TestValidator.predicate(
      "record has config_key",
      typeof (record as any).config_key === "string",
    );
    TestValidator.predicate(
      "record has config_value",
      (record as any).config_value !== null && (record as any).config_value !== undefined,
    );
    TestValidator.predicate(
      "record has config_type",
      typeof (record as any).config_type === "string",
    );
    TestValidator.predicate(
      "record has description",
      typeof (record as any).description === "string" || (record as any).description === null,
    );
    TestValidator.predicate(
      "record has is_active",
      typeof (record as any).is_active === "boolean",
    );
    TestValidator.predicate(
      "record has created_at",
      typeof (record as any).created_at === "string",
    );
    TestValidator.predicate(
      "record has updated_at",
      typeof (record as any).updated_at === "string",
    );
    TestValidator.predicate(
      "record has deleted_at",
      typeof (record as any).deleted_at === "string" || (record as any).deleted_at === null,
    );
  }
}
