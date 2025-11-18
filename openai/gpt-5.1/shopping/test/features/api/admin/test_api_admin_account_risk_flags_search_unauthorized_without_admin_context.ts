import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_account_risk_flags_search_unauthorized_without_admin_context(
  connection: api.IConnection,
) {
  // Prepare an unauthenticated connection by cloning the existing connection
  // but overriding headers with an empty object. This guarantees that no
  // Authorization header is sent, while strictly avoiding any mutation of the
  // original connection.headers per the rules.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Generate a syntactically valid adminId (UUID format) and a minimal
  // IShoppingMallAccountRiskFlag.IRequest body. All fields on IRequest are
  // optional, so an empty object is a valid request body.
  const adminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestBody = {} satisfies IShoppingMallAccountRiskFlag.IRequest;

  // Execute the PATCH /shoppingMall/admin/admins/{adminId}/accountRiskFlags
  // request using the unauthenticated connection and assert that it fails due
  // to missing admin authentication context. Per global guidelines, we do not
  // assert specific HTTP status codes; we only check that an error is thrown.
  await TestValidator.error(
    "admin account risk flags search must fail without admin auth context",
    async () => {
      return await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
        unauthenticatedConnection,
        {
          adminId,
          body: requestBody,
        },
      );
    },
  );
}
