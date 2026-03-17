import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_seller_approval_request_duplicate_pending_reapplication_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller rejection reason is initially empty",
    seller.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "seller approval status is not rejected before first approval request",
    seller.approval_status !== "rejected",
  );
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: firstReason,
        },
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "approval request seller matches authenticated seller",
    firstRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "approval request reason matches input",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "approval request remains unreviewed",
    firstRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "approval request reviewer is absent while pending",
    firstRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approval request is not deleted",
    firstRequest.deleted_at,
    null,
  );
  TestValidator.predicate(
    "approval request status is pending",
    firstRequest.status === "pending",
  );
  TestValidator.predicate(
    "embedded seller summary is not rejected during pending review",
    firstRequest.seller.approval_status !== "rejected",
  );
  const secondReason = RandomGenerator.paragraph({ sentences: 4 });
  await TestValidator.error(
    "duplicate pending reapplication is rejected",
    async () => {
      await generate_random_shopping_mall_seller_seller_approval_requests_create(
        sellerConnection,
        {
          body: {
            reason: secondReason,
          },
        },
      );
    },
  );
  TestValidator.equals(
    "original request seller remains unchanged",
    firstRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "original request status remains pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original request reason remains unchanged",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "original request remains unreviewed after duplicate failure",
    firstRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "original request reviewer remains absent after duplicate failure",
    firstRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "original request remains active after duplicate failure",
    firstRequest.deleted_at,
    null,
  );
}
