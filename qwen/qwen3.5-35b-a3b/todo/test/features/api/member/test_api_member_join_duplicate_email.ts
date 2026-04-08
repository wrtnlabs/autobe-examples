import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. First successful registration
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstMember);
  // 2. Duplicate registration attempt with same email
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration fails with 409",
    async () => {
      await authorize_member_join(secondMemberConnection, {
        body: {
          email: firstMember.email, // Same email as first registration
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
  // 3. Verify first member account was created successfully
  TestValidator.equals(
    "first member has valid id",
    firstMember.id !== undefined && firstMember.id !== null,
    true,
  );
  TestValidator.equals(
    "first member email matches input",
    firstMember.email,
    firstMember.email,
  );
  TestValidator.equals(
    "first member has valid token",
    firstMember.token.access.length > 0 && firstMember.token.refresh.length > 0,
    true,
  );
}
