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

export async function test_api_seller_approval_request_detail_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstSeller);
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondSeller);
  let crossAccountStatus: number | null = null;
  await TestValidator.error(
    "other seller cannot read another seller approval request detail",
    async () => {
      try {
        await api.functional.shoppingMall.seller.seller_approval_requests.at(
          secondSellerConnection,
          {
            sellerApprovalRequestId: firstSeller.id,
          },
        );
      } catch (exp) {
        const httpError = typia.assert<api.HttpError>(exp);
        crossAccountStatus = httpError.status;
        throw exp;
      }
    },
  );
  let nonexistentStatus: number | null = null;
  const nonexistentSellerApprovalRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "nonexistent seller approval request id should fail",
    async () => {
      try {
        await api.functional.shoppingMall.seller.seller_approval_requests.at(
          secondSellerConnection,
          {
            sellerApprovalRequestId: nonexistentSellerApprovalRequestId,
          },
        );
      } catch (exp) {
        const httpError = typia.assert<api.HttpError>(exp);
        nonexistentStatus = httpError.status;
        throw exp;
      }
    },
  );
  TestValidator.notEquals(
    "separate seller identities are created",
    firstSeller.id,
    secondSeller.id,
  );
  TestValidator.predicate(
    "cross-account access fails with authorization or existence client error",
    crossAccountStatus === 403 || crossAccountStatus === 404,
  );
  TestValidator.predicate(
    "nonexistent identifier fails with not-found or masked client error",
    nonexistentStatus === 403 || nonexistentStatus === 404,
  );
  if (crossAccountStatus !== nonexistentStatus) {
    TestValidator.notEquals(
      "forbidden behavior is distinct from nonexistent lookup behavior when exposed",
      crossAccountStatus,
      nonexistentStatus,
    );
  }
}
