import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Get verification details with a random ID
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verification =
    await api.functional.reddit.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 3. Verify verification status
  TestValidator.equals(
    "verification is active (deleted_at null)",
    verification.deleted_at,
    null,
  );
  TestValidator.predicate(
    "verification not expired",
    new Date(verification.expires_at) > new Date(),
  );
}
