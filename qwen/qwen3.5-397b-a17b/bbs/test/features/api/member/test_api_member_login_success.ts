import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for login testing
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate member profile information matches join result
  TestValidator.equals("member id matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches input", loginResult.email, email);
  TestValidator.equals(
    "display_name matches",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals("bio matches", loginResult.bio, joinResult.bio);
  TestValidator.equals(
    "account status is active",
    loginResult.status,
    "active",
  );
  // 4. Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResult.deleted_at,
    null,
  );
  // 5. Validate activity counts are non-negative integers
  TestValidator.predicate(
    "articles_count is non-negative",
    loginResult.articles_count >= 0,
  );
  TestValidator.predicate(
    "comments_count is non-negative",
    loginResult.comments_count >= 0,
  );
}
