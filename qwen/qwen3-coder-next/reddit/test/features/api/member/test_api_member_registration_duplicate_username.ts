import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registration with unique username
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: firstMemberEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt second registration with same username but different email
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  await TestValidator.error("should reject duplicate username", async () => {
    await api.functional.redditLike.auth.member.join(secondMemberConnection, {
      body: {
        email: secondMemberEmail,
        password: RandomGenerator.alphaNumeric(16),
        username: firstMember.username, // same username as first member
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeMember.IJoin,
    });
  });
  // 3. Verify first member is still valid and unaffected
  typia.assert(firstMember);
  TestValidator.notEquals(
    "emails differ",
    firstMember.email,
    secondMemberEmail,
  );
  TestValidator.equals(
    "first username unchanged",
    firstMember.username,
    firstMember.username,
  );
}
