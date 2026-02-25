import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_rejection_multiple_sellers(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  // Create seller1 with pending status
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller1Auth);
  TestValidator.equals(
    "seller1 initial status",
    seller1Auth.approvalStatus,
    "pending",
  );
  // Create seller2 with pending status
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller2Auth);
  TestValidator.equals(
    "seller2 initial status",
    seller2Auth.approvalStatus,
    "pending",
  );
  // Admin rejects seller1
  const rejectionReason1 = "Insufficient business credentials provided";
  const rejectedSeller1 =
    await api.functional.shoppingMall.admin.sellers.reject(adminConnection, {
      sellerId: seller1Auth.id,
      body: { reason: rejectionReason1 } satisfies IShoppingMallSeller.IReject,
    });
  typia.assert(rejectedSeller1);
  TestValidator.equals(
    "seller1 status after rejection",
    rejectedSeller1.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "seller1 rejection reason",
    rejectedSeller1.rejectionReason,
    rejectionReason1,
  );
  // Verify seller2 is still pending (unaffected by seller1 rejection)
  const seller2LoginResult = await authorize_seller_login(seller2Connection, {
    body: {
      email: seller2Auth.email,
      password: seller2Auth.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2LoginResult);
  TestValidator.equals(
    "seller2 still pending after seller1 rejection",
    seller2LoginResult.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "seller2 rejection reason should be null",
    seller2LoginResult.rejectionReason,
    null,
  );
  // Admin rejects seller2 with different reason
  const rejectionReason2 = "Shop name violates trademark policy";
  const rejectedSeller2 =
    await api.functional.shoppingMall.admin.sellers.reject(adminConnection, {
      sellerId: seller2Auth.id,
      body: { reason: rejectionReason2 } satisfies IShoppingMallSeller.IReject,
    });
  typia.assert(rejectedSeller2);
  TestValidator.equals(
    "seller2 status after rejection",
    rejectedSeller2.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "seller2 rejection reason",
    rejectedSeller2.rejectionReason,
    rejectionReason2,
  );
  // Verify each seller has their specific rejection reason
  TestValidator.notEquals(
    "different rejection reasons",
    rejectedSeller1.rejectionReason,
    rejectedSeller2.rejectionReason,
  );
  TestValidator.equals(
    "seller1 still rejected",
    rejectedSeller1.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "seller1 reason unchanged",
    rejectedSeller1.rejectionReason,
    rejectionReason1,
  );
}
