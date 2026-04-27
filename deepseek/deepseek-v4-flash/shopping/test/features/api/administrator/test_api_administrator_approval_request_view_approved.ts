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

export async function test_api_administrator_approval_request_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
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
  // 2. Register seller (implicitly creates a pending approval request)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Administrator approves the seller's pending approval request
  const requestId = seller.id;
  const updated =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Administrator retrieves the same approval request
  const retrieved =
    await api.functional.eCommerceMall.administrator.approval_requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(retrieved);
  // 5. Business logic validation (not redundant with typia.assert)
  TestValidator.predicate(
    "reviewed_at is set after approval",
    () => retrieved.reviewed_at !== null,
  );
  TestValidator.equals(
    "rejection_reason is null for approved request",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller approval_status is approved after admin action",
    retrieved.seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "reviewer id matches the acting admin",
    retrieved.reviewer!.id,
    admin.id,
  );
  TestValidator.equals(
    "reviewer email matches the acting admin",
    retrieved.reviewer!.email,
    admin.email,
  );
  TestValidator.equals(
    "reviewer grade is set",
    retrieved.reviewer!.grade,
    admin.grade,
  );
  TestValidator.equals(
    "seller id matches the registered seller",
    retrieved.seller.id,
    seller.id,
  );
  TestValidator.predicate("updated_at is after created_at", () => {
    const created = new Date(retrieved.created_at).getTime();
    const updatedTime = new Date(retrieved.updated_at).getTime();
    return updatedTime > created;
  });
}
