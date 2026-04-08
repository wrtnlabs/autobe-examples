import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_seller_approval_requests_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(firstSeller);
  // 2. First seller submits approval request
  const firstApprovalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      firstSellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(firstApprovalRequest);
  // 3. Register second seller
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(secondSeller);
  // 4. Second seller submits approval request
  const secondApprovalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      secondSellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(secondApprovalRequest);
  // 5. List all approval requests (using second seller's connection for authenticated access)
  const listResponse =
    await api.functional.ecommerceMall.seller.seller_approvals.index(
      secondSellerConnection,
      {
        body: {
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(listResponse);
  // 6. Validate response structure
  TestValidator.equals(
    "response structure",
    {
      pagination: listResponse.pagination,
      data: listResponse.data,
    } satisfies IPageIEcommerceMallSellerApprovalRequest.ISummary,
    listResponse,
  );
  // 7. Validate pagination metadata
  TestValidator.equals("current page", listResponse.pagination.current, 1);
  TestValidator.equals("limit", listResponse.pagination.limit, 10);
  TestValidator.equals("total records", listResponse.pagination.records, 2);
  TestValidator.equals(
    "total pages",
    listResponse.pagination.pages,
    Math.ceil(listResponse.pagination.records / listResponse.pagination.limit),
  );
  // 8. Validate data array
  TestValidator.equals("data length", listResponse.data.length, 2);
  // 9. Validate each approval request
  for (const request of listResponse.data) {
    typia.assert(request);
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.equals(
      "reviewer is null for pending",
      request.reviewer ?? null,
      null,
    );
    TestValidator.equals(
      "rejection_reason is null for pending",
      request.rejection_reason ?? null,
      null,
    );
    TestValidator.notEquals("has seller reference", request.seller, null);
    TestValidator.predicate(
      "seller has email",
      request.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller display_name is string",
      typeof request.seller.display_name === "string",
    );
  }
  // 10. Validate sorting (newest first)
  if (listResponse.data.length >= 2) {
    TestValidator.predicate(
      "first item is newest",
      listResponse.data[0].created_at >= listResponse.data[1].created_at,
    );
  }
}
