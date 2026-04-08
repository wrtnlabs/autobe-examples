import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_request_submission_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account (join returns authorized response)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Submit admin request as seller requesting super_admin grade
  const adminRequest = await authorize_admin_join(sellerConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "super_admin",
      reason:
        "I want to help manage the platform and ensure quality standards for all sellers.",
      href: "https://example.com/admin-request",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Validate the response with typia.assert()
  typia.assert(adminRequest);
  // 4. Validate response structure
  TestValidator.equals(
    "has valid id",
    typeof adminRequest.id === "string",
    true,
  );
  TestValidator.equals("has valid email", adminRequest.email.length > 0, true);
  TestValidator.equals("has valid name", adminRequest.name.length > 0, true);
  TestValidator.equals(
    "has created_at",
    typeof adminRequest.created_at === "string",
    true,
  );
  TestValidator.equals(
    "has updated_at",
    typeof adminRequest.updated_at === "string",
    true,
  );
  TestValidator.equals("deleted_at is null", adminRequest.deleted_at, null);
  // 5. Validate authorization token structure
  TestValidator.equals(
    "has access token",
    typeof adminRequest.token.access === "string",
    true,
  );
  TestValidator.equals(
    "has refresh token",
    typeof adminRequest.token.refresh === "string",
    true,
  );
  TestValidator.equals(
    "has expired_at",
    typeof adminRequest.token.expired_at === "string",
    true,
  );
  TestValidator.equals(
    "has refreshable_until",
    typeof adminRequest.token.refreshable_until === "string",
    true,
  );
  // 6. Validate token expiration is in the future
  const expiredAt = new Date(adminRequest.token.expired_at);
  const now = new Date();
  TestValidator.predicate("access token not expired", expiredAt > now);
  const refreshableUntil = new Date(adminRequest.token.refreshable_until);
  TestValidator.predicate(
    "refresh token refreshable in future",
    refreshableUntil > now,
  );
}
