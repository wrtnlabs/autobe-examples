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

export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for testing
  const email = typia.random<string & tags.Format<"email">>();
  // Create first member with the email
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(firstMember);
  // Verify first registration was successful
  TestValidator.equals("email matches", firstMember.email, email);
  // Attempt to create a second member with the same email - should fail
  await TestValidator.error("duplicate email should be rejected", async () => {
    const secondMemberConnection: api.IConnection = { host: connection.host };
    await api.functional.todoApp.auth.member.join(secondMemberConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    });
  });
}
