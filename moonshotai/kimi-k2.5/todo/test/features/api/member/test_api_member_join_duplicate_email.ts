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
  // Create first member with a specific email
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.MinLength<1> & tags.Format<"email">>();
  const firstMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(firstMember);
  // Attempt to create second member with same email - should fail with 409
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () => {
      await authorize_member_join(duplicateConnection, {
        body: {
          email, // Same email as first member
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"url">>(),
          referrer: typia.random<string & tags.Format<"url">>(),
        },
      });
    },
  );
}