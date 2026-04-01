import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Pw-${RandomGenerator.alphaNumeric(12)}!` as string &
    tags.Format<"password">;
  const body = {
    email,
    password,
    href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/landing/${RandomGenerator.alphaNumeric(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMallPlatformSeller.IJoin;
  const output = await authorize_seller_join(sellerConnection, { body });
  typia.assert(output);
  TestValidator.equals(
    "seller email should match join request",
    output.email,
    email,
  );
  TestValidator.equals(
    "rejection reason should be null on success",
    output.rejectionReason,
    null,
  );
  TestValidator.equals(
    "deletedAt should be null for active seller",
    output.deletedAt,
    null,
  );
  TestValidator.predicate(
    "token access should be provided",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should be provided",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiry should be provided",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refresh deadline should be provided",
    output.token.refreshable_until.length > 0,
  );
}
