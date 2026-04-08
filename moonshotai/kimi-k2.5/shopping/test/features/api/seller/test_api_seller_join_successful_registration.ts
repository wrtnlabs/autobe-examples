import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Create isolated connection for seller actor
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate valid random registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Execute seller registration using mandatory utility function
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Validate complete response structure
  typia.assert(seller);
  typia.assert(seller.token);
  // Business logic validations
  TestValidator.equals("email matches input credentials", seller.email, email);
  TestValidator.equals(
    "approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  TestValidator.equals("profile is null for new seller", seller.profile, null);
  TestValidator.equals(
    "deletedAt is null for active account",
    seller.deletedAt,
    null,
  );
  TestValidator.predicate(
    "access token is non-empty",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    seller.token.refresh.length > 0,
  );
  // Timestamp validity checks
  const now = new Date();
  TestValidator.predicate(
    "expired_at is future timestamp",
    new Date(seller.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is future timestamp",
    new Date(seller.token.refreshable_until) > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(seller.token.refreshable_until) >
      new Date(seller.token.expired_at),
  );
}
