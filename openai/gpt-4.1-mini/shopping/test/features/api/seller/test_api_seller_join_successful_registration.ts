import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the seller actor
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate valid join data for seller registration
  const body: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  };
  // Use the utility function to perform seller join (registration)
  const authorized = await authorize_seller_join(sellerConnection, { body });
  typia.assert(authorized);
  // Validate presence and format of JWT tokens in the response
  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  // Validate expiration timestamps are in ISO 8601 date-time format
  TestValidator.predicate(
    "access token expired_at format",
    typeof authorized.token.expired_at === "string" &&
      !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until format",
    typeof authorized.token.refreshable_until === "string" &&
      !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // Attempt duplicate registration to test error handling
  await TestValidator.error("duplicate seller email registration", async () => {
    await authorize_seller_join({ host: connection.host }, { body });
  });
}
