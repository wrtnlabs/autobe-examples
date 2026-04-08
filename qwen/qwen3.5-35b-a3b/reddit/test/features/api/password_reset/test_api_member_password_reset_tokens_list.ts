import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_tokens_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: member.token.access };
  // 3. List password reset tokens (empty initially)
  const response =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate empty state - no password reset tokens exist
  TestValidator.equals("empty items count", response.data.length, 0);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  // 5. Verify pagination structure integrity
  TestValidator.predicate(
    "pagination has all required fields",
    response.pagination.current !== undefined &&
      response.pagination.limit !== undefined &&
      response.pagination.records !== undefined &&
      response.pagination.pages !== undefined,
  );
}
