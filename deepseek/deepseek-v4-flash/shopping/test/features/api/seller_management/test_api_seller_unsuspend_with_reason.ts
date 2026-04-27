import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_unsuspend_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Seller submits approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Administrator approves seller registration
  const approved =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approved);
  // 5. Administrator suspends seller
  const suspendReason = "Violation of platform sales policies";
  const suspended =
    await api.functional.eCommerceMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: { reason: suspendReason } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspended);
  // 6. Administrator unsuspends seller with reason
  const unsuspendReason =
    "Issues resolved - seller has complied with platform policies";
  const unsuspended =
    await api.functional.eCommerceMall.administrator.sellers.unsuspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: unsuspendReason,
        } satisfies IECommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspended);
  // 7. Verify unsuspend response
  TestValidator.equals(
    "approval status is approved after unsuspend",
    unsuspended.approval_status,
    "approved",
  );
  TestValidator.equals("seller id preserved", unsuspended.id, seller.id);
  TestValidator.equals(
    "seller email preserved",
    unsuspended.email,
    seller.email,
  );
  TestValidator.predicate(
    "seller profile exists",
    unsuspended.profile !== null,
  );
  TestValidator.predicate(
    "seller profile has shop name",
    () => unsuspended.profile!.shopName !== "",
  );
}
