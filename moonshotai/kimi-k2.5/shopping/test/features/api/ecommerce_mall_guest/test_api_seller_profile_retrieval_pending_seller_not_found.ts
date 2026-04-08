import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the error scenario when a guest attempts to retrieve a seller profile
 * for a seller whose registration is still pending approval.
 *
 * @param connection - Base connection
 */
export async function test_api_seller_profile_retrieval_pending_seller_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish a guest session to obtain JWT authentication token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Generate a random sellerId representing a pending/non-existent seller
  // Since seller profiles are only created when a seller receives administrator approval,
  // a random UUID represents a seller that either doesn't exist or hasn't been approved
  const pendingSellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve the profile of the pending seller
  // Step 4: Verify that a 404 Not Found error is returned
  await TestValidator.httpError(
    "should return 404 for pending/unapproved seller profile",
    404,
    async () => {
      await api.functional.ecommerceMall.guest.sellers.profile.at(
        guestConnection,
        { sellerId: pendingSellerId },
      );
    },
  );
}
