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

export async function test_api_seller_account_email_identity_change(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: `seller_${RandomGenerator.alphabets(10)}@example.com` as string &
      tags.Format<"email">,
    password: "password1234",
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IMallPlatformSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const originalEmail = authorized.email;
  const updatedEmail =
    `updated_${RandomGenerator.alphabets(10)}@example.com` as string &
      tags.Format<"email">;
  const updated = await api.functional.mallPlatform.seller.account.update(
    sellerConnection,
    {
      body: {
        email: updatedEmail,
      } satisfies IMallPlatformCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "seller account id should remain the same",
    updated.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller email should be updated",
    updated.email,
    updatedEmail,
  );
  TestValidator.notEquals(
    "seller email should change",
    updated.email,
    originalEmail,
  );
  TestValidator.equals(
    "seller account should preserve createdAt",
    updated.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "seller account should preserve deletedAt",
    updated.deletedAt,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "seller account should preserve status",
    updated.status,
    authorized.status,
  );
}
