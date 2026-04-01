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

export async function test_api_seller_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const localPart = RandomGenerator.alphaNumeric(10);
  const email = `${localPart}@test.com` as string & tags.Format<"email">;
  const password = `${RandomGenerator.alphaNumeric(12)}Aa!` as string &
    tags.Format<"password">;
  const href = "https://example.com/seller/register" as string &
    tags.Format<"uri">;
  const referrer = "https://example.com/landing" as string & tags.Format<"uri">;
  const firstJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(firstJoin);
  TestValidator.equals(
    "joined email should match request",
    firstJoin.email,
    email,
  );
  await TestValidator.httpError(
    "duplicate seller email should be rejected",
    400,
    async () => {
      const duplicateConnection: api.IConnection = { host: connection.host };
      await authorize_seller_join(duplicateConnection, {
        body: {
          email,
          password: `${RandomGenerator.alphaNumeric(14)}Bb!` as string &
            tags.Format<"password">,
          href: "https://example.com/seller/register-again" as string &
            tags.Format<"uri">,
          referrer: "https://example.com/another-referrer" as string &
            tags.Format<"uri">,
          ip: "127.0.0.1",
        } satisfies IMallPlatformSeller.IJoin,
      });
    },
  );
}
