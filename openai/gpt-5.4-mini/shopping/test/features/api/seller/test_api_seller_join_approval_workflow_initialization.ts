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

export async function test_api_seller_join_approval_workflow_initialization(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(10)}Aa1!`,
    href: "https://example.com/seller/join",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMallPlatformSeller.IJoin;
  const output = await authorize_seller_join(sellerConnection, { body: input });
  typia.assert(output);
  TestValidator.equals(
    "seller email should match registration input",
    output.email,
    input.email,
  );
  TestValidator.equals(
    "seller rejection reason should start as null",
    output.rejectionReason,
    null,
  );
  TestValidator.equals(
    "seller deletedAt should be null for active account",
    output.deletedAt,
    null,
  );
  TestValidator.equals(
    "seller token access should be issued",
    output.token.access,
    output.token.access,
  );
  TestValidator.equals(
    "seller token refresh should be issued",
    output.token.refresh,
    output.token.refresh,
  );
  const authorizedSellerConnection: api.IConnection = { host: connection.host };
  authorizedSellerConnection.headers = {
    Authorization: output.token.access,
  };
  TestValidator.equals(
    "authorized seller connection host should match base host",
    authorizedSellerConnection.host,
    connection.host,
  );
}
