import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_item_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test that unauthenticated requests are denied access to the admin order item endpoint
  // Call GET /ecommerceMall/admin/order-items/{orderItemId} without providing any authentication credentials
  // Validate the response returns a 401 or 403 status code indicating unauthorized access
  // Generate a random order item UUID for testing
  const randomOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // Create a connection WITHOUT authentication headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Attempt to access admin order item endpoint without authentication
  // This should fail with 401 or 403 unauthorized status
  await TestValidator.httpError(
    "unauthorized access denied",
    [401, 403],
    async () => {
      await api.functional.ecommerceMall.admin.order_items.at(
        unauthenticatedConnection,
        {
          orderItemId: randomOrderItemId,
        },
      );
    },
  );
}
