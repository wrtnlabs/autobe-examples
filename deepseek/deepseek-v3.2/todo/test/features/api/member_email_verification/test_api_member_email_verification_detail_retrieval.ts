import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  TestValidator.predicate("member should have id", member.id.length > 0);
  TestValidator.predicate(
    "member should have token",
    member.token.access.length > 0,
  );
  // 2. Test that unauthorized access fails (no authentication)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.todoApp.member.email_verifications.at(
      unauthorizedConnection,
      {
        verificationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 3. Test with authenticated connection but random UUID
  // Should return error (404 or similar) since verification doesn't exist
  await TestValidator.error(
    "non-existent verification should fail",
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        memberConnection,
        {
          verificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Verify member connection has authorization headers
  TestValidator.predicate(
    "member connection should have authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
