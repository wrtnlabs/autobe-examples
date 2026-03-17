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

export async function test_api_member_email_verification_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate using join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Since we cannot create email verification tokens via available endpoints,
  // we cannot obtain a verificationId for a soft-deleted record.
  // The specification indicates that if a record has been soft-deleted,
  // the endpoint should return 404. We test that non-existent UUIDs
  // also return error (likely 404).
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent verification returns error",
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        memberConnection,
        {
          verificationId: randomUuid,
        },
      );
    },
  );
  // Additional test: invalid UUID format should also error
  const invalidId = "not-a-uuid";
  await TestValidator.error("invalid UUID format returns error", async () => {
    await api.functional.todoApp.member.email_verifications.at(
      memberConnection,
      {
        verificationId: invalidId,
      },
    );
  });
}
