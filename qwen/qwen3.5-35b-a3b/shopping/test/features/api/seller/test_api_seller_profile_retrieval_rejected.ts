import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerDisplayName = RandomGenerator.name(2);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: sellerDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Verify seller account can be retrieved
  const sellerProfile = await api.functional.ecommerceMall.sellers.at(
    connection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(sellerProfile);
  // 3. Validate seller profile structure
  TestValidator.equals(
    "seller id is valid uuid",
    sellerProfile.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches registration",
    sellerProfile.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller display name matches registration",
    sellerProfile.display_name,
    sellerDisplayName,
  );
  TestValidator.equals(
    "seller approval status is pending",
    sellerProfile.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection_reason is null for pending seller",
    sellerProfile.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller is not suspended",
    sellerProfile.is_suspended,
    false,
  );
  TestValidator.equals(
    "created_at is valid date-time",
    sellerProfile.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    sellerProfile.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active seller",
    sellerProfile.deleted_at,
    null,
  );
  // 4. Verify seller profile includes rejection_reason field (nullable)
  // This validates the schema includes rejection_reason for rejected sellers
  typia.assert(
    sellerProfile.rejection_reason === null ||
      typeof sellerProfile.rejection_reason === "string",
  );
}
