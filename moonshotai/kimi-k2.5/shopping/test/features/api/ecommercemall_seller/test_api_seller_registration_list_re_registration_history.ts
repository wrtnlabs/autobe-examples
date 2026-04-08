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
 * Test the re-registration workflow scenario where a seller views their registration history.
 *
 * Steps:
 * 1. Register a new seller account via the join endpoint (creates a registration record)
 * 2. Query the seller registrations endpoint to retrieve the registration history
 * 3. Validate the response contains properly structured paginated registration data
 */
export async function test_api_seller_registration_list_re_registration_history(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a seller connection by registering a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/registration",
      referrer: "https://example.com",
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Step 2: Query the seller registrations endpoint to get registration history
  const response =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(response);
  // Step 3: Validate business logic - seller should see their own registrations
  TestValidator.predicate(
    "seller can view their registration history",
    response.data.length >= 1,
  );
  // Step 4: Validate the registration belongs to the authenticated seller
  const firstRegistration = response.data[0];
  TestValidator.equals(
    "registration seller ID matches authenticated seller",
    firstRegistration.seller.id,
    sellerAuth.id,
  );
  // Step 5: Validate registration status is valid
  const validStatuses = ["pending", "approved", "rejected"] as const;
  TestValidator.predicate(
    "registration has valid business status",
    validStatuses.includes(
      firstRegistration.status as (typeof validStatuses)[number],
    ),
  );
  // Step 6: For new registrations, reviewer should be null and rejectionReason null
  TestValidator.predicate(
    "new registration has no reviewer assigned yet",
    firstRegistration.reviewer === null,
  );
  TestValidator.predicate(
    "new registration has no rejection reason",
    firstRegistration.rejectionReason === null,
  );
  TestValidator.predicate(
    "new registration has no reviewed timestamp",
    firstRegistration.reviewedAt === null,
  );
}
