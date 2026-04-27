import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(authorized);
  // Verify the member's account is active (deleted_at is null)
  TestValidator.predicate(
    "active account has deleted_at null",
    authorized.deleted_at === null,
  );
  // 2. Login with correct credentials — should succeed
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Login with wrong password — should return 401 with generic error
  await TestValidator.httpError(
    "invalid credentials on wrong password",
    401,
    async () => {
      await api.functional.communityPlatform.auth.member.login(connection, {
        body: {
          email,
          password: "this_is_definitely_wrong_password",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
  // 4. Login with non-existent email — should return 401 with generic error
  await TestValidator.httpError(
    "invalid credentials on non-existent email",
    401,
    async () => {
      await api.functional.communityPlatform.auth.member.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
}
