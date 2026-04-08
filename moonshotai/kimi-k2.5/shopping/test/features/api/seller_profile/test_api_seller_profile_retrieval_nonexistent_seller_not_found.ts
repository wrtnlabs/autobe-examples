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

export async function test_api_seller_profile_retrieval_nonexistent_seller_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish a guest session to obtain JWT authentication token
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/test",
      referrer: "https://example.com",
    } satisfies Partial<IEcommerceMallGuest.IJoin>,
  });
  // 2. Generate a random UUID for a non-existent seller
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve profile for non-existent seller
  // Should throw HttpError with 404 status code
  await TestValidator.httpError(
    "should return 404 for non-existent seller",
    404,
    async () => {
      await api.functional.ecommerceMall.guest.sellers.profile.at(
        guestConnection,
        {
          sellerId: nonExistentSellerId,
        },
      );
    },
  );
}
