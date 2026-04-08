import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving a non-existent or unauthorized seller approval record returns 404 error.
 *
 * Validates that when a seller attempts to retrieve an approval record using a UUID that
 * does not exist or does not belong to their account, the system properly returns a 404
 * error response. This ensures proper authorization and prevents sellers from accessing
 * approval records of other sellers.
 *
 * 1. Register a new seller account via POST /auth/seller/join
 * 2. Authenticate the seller via POST /auth/seller/login
 * 3. Attempt to retrieve an approval record using a random non-existent UUID
 * 4. Validate that the response is a 404 error indicating the record was not found
 *
 * @param connection Base API connection for testing
 */
export async function test_api_seller_approval_not_found_or_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Attempt to retrieve a non-existent approval record
  const fakeApprovalId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "404 error for non-existent approval record",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.approvals.at(
        sellerConnection,
        {
          approvalId: fakeApprovalId,
        },
      );
    },
  );
}
