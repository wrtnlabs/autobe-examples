import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMemberEmailVerification";
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

export async function test_api_email_verification_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@example.com",
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Wait for the token to expire (5 seconds in test environment)
  await new Promise((resolve) => setTimeout(resolve, 5000));
  // 3. Retrieve expired tokens
  const expiredTokens =
    await api.functional.reddit.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "expired",
        } satisfies IRedditMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredTokens);
  // 4. Validate results
  TestValidator.predicate(
    "expired tokens found",
    expiredTokens.data.length > 0,
  );
  if (expiredTokens.data.length > 0) {
    const token = expiredTokens.data[0];
    TestValidator.predicate(
      "token has expired_at",
      new Date(token.expires_at) < new Date(),
    );
    TestValidator.predicate(
      "token has deleted_at",
      token.deleted_at !== undefined && token.deleted_at !== null,
    );
  }
}
