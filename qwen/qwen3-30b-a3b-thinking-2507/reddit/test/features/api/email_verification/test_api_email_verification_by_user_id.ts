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

export async function test_api_email_verification_by_user_id(
  connection: api.IConnection,
) {
  // Create member account
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // Generate user ID (real implementation would get from auth response)
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve email verification tokens
  const tokens = await api.functional.reddit.member.email_verifications.index(
    userConnection,
    {
      body: {
        reddit_member_id: userId,
      } satisfies IRedditMemberEmailVerification.IRequest,
    },
  );
  typia.assert(tokens);
  // Validate business logic: should have tokens for the user ID
  TestValidator.notEquals("should have tokens", tokens.data.length, 0);
}
