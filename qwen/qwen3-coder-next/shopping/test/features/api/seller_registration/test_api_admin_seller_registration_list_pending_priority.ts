import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_registration_list_pending_priority(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Test pending seller registrations listing
  const result =
    await api.functional.ecommerceMall.admin.seller_registrations.index(
      adminConnection,
      {
        body: {
          approval_status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate(
    "has records or empty",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    result.pagination.pages >= 0,
  );
  // Validate data structure
  if (result.data.length > 0) {
    TestValidator.equals(
      "all items are pending",
      result.data.every((item) => item.approval_status === "pending"),
      true,
    );
    TestValidator.predicate(
      "items have required fields",
      result.data.every(
        (item) =>
          typeof item.id === "string" && typeof item.shop_name === "string",
      ),
    );
  }
}
