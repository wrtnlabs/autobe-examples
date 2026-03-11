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

export async function test_api_seller_registration_session_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with unique credentials
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const result = await authorize_seller_join(connection, {
    body: {
      email: joinEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Validate IAuthorized response structure
  typia.assert(result);
  TestValidator.predicate("seller id exists", !!result.id);
  TestValidator.equals("email matches registered", result.email, joinEmail);
  // 3. Validate approval_status is pending for new registration
  TestValidator.equals(
    "approval status is pending",
    result.approval_status,
    "pending",
  );
  // 4. Validate token structure
  typia.assert(result.token);
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  typia.assert(result.token.expired_at);
  typia.assert(result.token.refreshable_until);
  // 5. Verify refreshable_until is after expired_at (session can be refreshed before access token expires)
  TestValidator.predicate(
    "refreshable after access token expires",
    new Date(result.token.refreshable_until).getTime() >
      new Date(result.token.expired_at).getTime(),
  );
  // 6. Validate is_suspended and is_banned flags
  TestValidator.equals("seller is not suspended", result.is_suspended, false);
  TestValidator.equals("seller is not banned", result.is_banned, false);
  // 7. Validate created_at and updated_at are present
  typia.assert(result.created_at);
  typia.assert(result.updated_at);
  TestValidator.predicate("created_at exists", result.created_at.length > 0);
  TestValidator.predicate("updated_at exists", result.updated_at.length > 0);
  // 8. Verify deleted_at is optional (can be undefined)
  if (result.deleted_at !== undefined) {
    typia.assert(result.deleted_at);
  }
}
