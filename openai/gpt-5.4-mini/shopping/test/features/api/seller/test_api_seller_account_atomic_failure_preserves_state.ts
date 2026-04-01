import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_account_atomic_failure_preserves_state(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerJoin = await authorize_seller_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: "1234",
      href: "https://example.com/register/owner",
      referrer: "https://example.com/landing/owner",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerJoin);
  const conflictingConnection: api.IConnection = { host: connection.host };
  const conflictingEmail = typia.random<string & tags.Format<"email">>();
  const conflictingJoin = await authorize_seller_join(conflictingConnection, {
    body: {
      email: conflictingEmail,
      password: "1234",
      href: "https://example.com/register/conflict",
      referrer: "https://example.com/landing/conflict",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(conflictingJoin);
  const beforeEmail = ownerJoin.email;
  const beforeStatus = ownerJoin.status;
  const beforeDeletedAt = ownerJoin.deletedAt;
  await TestValidator.error(
    "seller account update should reject duplicate email mutation",
    async () => {
      await api.functional.mallPlatform.seller.account.update(ownerConnection, {
        body: {
          email: conflictingEmail,
        } satisfies IMallPlatformCustomer.IUpdate,
      });
    },
  );
  TestValidator.equals(
    "seller email should remain unchanged after failed update",
    ownerJoin.email,
    beforeEmail,
  );
  TestValidator.equals(
    "seller account status should remain unchanged after failed update",
    ownerJoin.status,
    beforeStatus,
  );
  TestValidator.equals(
    "seller account deletion state should remain unchanged after failed update",
    ownerJoin.deletedAt,
    beforeDeletedAt,
  );
}
