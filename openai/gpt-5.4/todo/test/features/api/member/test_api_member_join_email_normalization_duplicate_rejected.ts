import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_email_normalization_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  const localLeft = RandomGenerator.alphaNumeric(8);
  const localRight = RandomGenerator.alphaNumeric(6);
  const domain = `${RandomGenerator.alphabets(6)}.com`;
  const canonicalEmail = `${localLeft}.${localRight}@${domain}`;
  const firstEmail = `${localLeft.toUpperCase()}.${localRight.toLowerCase()}@${domain}`;
  const secondEmail = `${localLeft.toLowerCase()}.${localRight.toUpperCase()}@${domain}`;
  const firstConnection: api.IConnection = { host: connection.host };
  const first = await authorize_member_join(firstConnection, {
    body: {
      email: firstEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(first);
  TestValidator.equals(
    "returned member email is the same logical identity ignoring case",
    first.email.toLowerCase(),
    canonicalEmail.toLowerCase(),
  );
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate member join is rejected for differently cased equivalent email",
    async () => {
      await authorize_member_join(secondConnection, {
        body: {
          email: secondEmail,
          password: typia.random<string & tags.Format<"password">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
}
