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

export async function test_api_seller_account_self_read(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const authorized = await api.functional.mallPlatform.auth.seller.join(
    sellerConnection,
    {
      body: {
        email,
        password,
        href: "https://example.com/seller/join",
        referrer: "https://example.com/landing",
        ip: "127.0.0.1",
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(authorized);
  const self =
    await api.functional.mallPlatform.seller.account.at(sellerConnection);
  typia.assert(self);
  TestValidator.equals(
    "seller account id should match authenticated seller",
    self.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller account email should match authenticated seller",
    self.email,
    authorized.email,
  );
  TestValidator.predicate(
    "seller account status should be a non-empty lifecycle state",
    self.status.length > 0,
  );
  TestValidator.predicate(
    "seller account createdAt should be a valid timestamp",
    self.createdAt.length > 0,
  );
  TestValidator.predicate(
    "seller account updatedAt should be a valid timestamp",
    self.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "seller account deletedAt should be null or a timestamp",
    self.deletedAt === null || self.deletedAt.length > 0,
  );
  await TestValidator.error(
    "unauthenticated seller account read should fail",
    async () => {
      const anonymousConnection: api.IConnection = { host: connection.host };
      await api.functional.mallPlatform.seller.account.at(anonymousConnection);
    },
  );
}
