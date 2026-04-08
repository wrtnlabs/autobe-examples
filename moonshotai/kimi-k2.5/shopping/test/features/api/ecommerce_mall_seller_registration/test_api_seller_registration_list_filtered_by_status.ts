import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering seller registration history by status.
 * Authenticates as a seller and tests filtering registrations by 'pending' and 'rejected' statuses.
 * Validates that filtering correctly narrows results and that each response contains registrations
 * matching only the specified status, with correct pagination record counts.
 */
export async function test_api_seller_registration_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Filter by 'pending' status
  const pendingResponse =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate all results have 'pending' status
  for (const registration of pendingResponse.data) {
    TestValidator.predicate(
      `registration status is pending: ${registration.id}`,
      registration.status === "pending",
    );
  }
  // 3. Filter by 'rejected' status
  const rejectedResponse =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate all results have 'rejected' status
  for (const registration of rejectedResponse.data) {
    TestValidator.predicate(
      `registration status is rejected: ${registration.id}`,
      registration.status === "rejected",
    );
  }
  // 4. Validate pagination records reflect filtered count
  // The data array length should match the records count in pagination
  TestValidator.equals(
    "pending data count matches pagination records",
    pendingResponse.data.length,
    pendingResponse.pagination.records,
  );
  TestValidator.equals(
    "rejected data count matches pagination records",
    rejectedResponse.data.length,
    rejectedResponse.pagination.records,
  );
}
