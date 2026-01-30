import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for testing duplicate registration
  const email = typia.random<string & tags.Format<"email">>();
  // Step 1: Successfully register the first member with the generated email
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email,
      password: "SecurePass123",
      nickname: "FirstMember",
    } satisfies DeepPartial<ITodoAppMember.IJoin>,
  });
  typia.assert(firstMember);
  // Step 2: Attempt to register a second member with the same email
  // This should fail with a conflict error since the email is already registered
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_member_join(secondMemberConnection, {
        body: {
          email, // Same email as the first member
          password: "DifferentPass456",
          nickname: "SecondMember",
        } satisfies DeepPartial<ITodoAppMember.IJoin>,
      });
    },
  );
}
