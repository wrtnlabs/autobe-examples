import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_with_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Submit seller registration request
  const authorized = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(authorized);
  // Validate response structure
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "approval_status is pending",
    authorized.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection_reason is null",
    authorized.rejection_reason,
    null,
  );
  TestValidator.equals("rejected_at is null", authorized.rejected_at, null);
  TestValidator.predicate("has valid id", authorized.id.length > 0);
  TestValidator.predicate(
    "has valid created_at",
    authorized.created_at !== null,
  );
  TestValidator.predicate(
    "has valid updated_at",
    authorized.updated_at !== null,
  );
  TestValidator.predicate(
    "has valid token access",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid token refresh",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid token expired_at",
    authorized.token.expired_at !== null,
  );
  TestValidator.predicate(
    "has valid token refreshable_until",
    authorized.token.refreshable_until !== null,
  );
}
